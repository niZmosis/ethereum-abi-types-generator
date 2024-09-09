import path from 'path'

import type {
  AbiInput,
  AbiItem,
  AbiOutput,
  GenerateResponse,
  GeneratorContext,
} from '@ethereum-abi-types-generator/types'
import {
  abiItemsMap,
  buildExecutingPath,
  capitalize,
  formatAbiName,
  getAbiFileLocationRawName,
  isAcceptsEther,
  isDirectory,
  isEthersLibrary,
  isNeverModifyBlockchainState,
  libraryMap,
  libraryTypes,
  Logger,
  solidityTypeMap,
} from '@ethereum-abi-types-generator/utils'
import fs from 'fs-extra'

import { EthersFactory } from './ethers-factory'
import { Web3Factory } from './web3-factory'
import TypeScriptHelpers from '../utils/helpers'

export class AbiGenerator {
  private _web3Factory = new Web3Factory()
  private _ethersFactory = new EthersFactory()

  // The contexts
  private _parametersAndReturnTypeInterfaces: string[] = []
  private _events: string[] = []
  private _methodNames: string[] = []

  constructor(private _context: GeneratorContext) {}

  /**
   * Generates all the typings
   * @returns The location the file was generated to
   */
  public async generate(): Promise<GenerateResponse> {
    this.clearAllQuotesFromContextInfo()

    if (!isDirectory(this.getOutputPathDirectory())) {
      if (this._context.makeOutputDir) {
        fs.ensureDirSync(this.getOutputPathDirectory())
      } else {
        throw new Error(`output path must be a directory`)
      }
    }

    const outputLocation = this.buildOutputLocation()

    if (this._context.preventOverwrite && fs.existsSync(outputLocation)) {
      Logger.warning(
        `File ${outputLocation} already exists and preventOverwrite is true. Skipping file generation.`,
      )

      return {
        abiName: this.getAbiName(),
        outputLocation,
        abiJsonFileLocation: this.getAbiFileFullPathLocation(),
      }
    }

    await this.generateCommonTypesFile()

    const abi: AbiItem[] = this.getAbiJson()

    const fullTypings = this.buildFullTypings({
      abi,
      abiTypedInterface: this.buildAbiInterface(abi),
    })

    // const formattedContent = await formatAndLintCode(
    //   fullTypings,
    //   this._context.eslintOptions,
    //   this._context.eslintConfigPath,
    //   this._context.prettierOptions,
    //   this._context.prettierConfigPath,
    // )

    fs.writeFileSync(outputLocation, fullTypings, {
      mode: 0o755,
    })

    this.clearState()

    if (this._context.watch) {
      this.watchForChanges()
    }

    return {
      abiName: this.getAbiName(true),
      outputLocation,
      abiJsonFileLocation: this.getAbiFileFullPathLocation(),
    }
  }

  /**
   * Clear all quote strings from the context file info
   */
  private clearAllQuotesFromContextInfo(): void {
    this._context.inputPath = this._context.inputPath.replace(/\'/g, '')
    if (this._context.outputDir) {
      this._context.outputDir = this._context.outputDir.replace(/\'/g, '')
    }
  }

  /**
   * Clear the state down
   */
  private clearState(): void {
    this._parametersAndReturnTypeInterfaces = []
    this._events = []
    this._methodNames = []
  }

  /**
   * Watch for ABI file changes
   */
  private watchForChanges(): void {
    // Don't let anymore watches happen once the first one is registered
    this._context.watch = false
    let fsWait = false
    fs.watch(this.getAbiFileFullPathLocation(), (_event, filename) => {
      if (filename) {
        if (fsWait) return
        setTimeout(() => {
          fsWait = false
        }, 100)

        const outputLocation = this.generate()
        Logger.log(
          `Successfully updated typings for abi file ${this.getAbiFileFullPathLocation()} saved in ${outputLocation}`,
        )
      }
    })
  }

  /**
   * Get the output path directory
   */
  private getOutputPathDirectory(): string {
    if (this._context.outputDir) {
      return this._context.outputDir
    }

    return path.dirname(this.getAbiFileFullPathLocation())
  }

  /**
   * Build output location
   */
  private buildOutputLocation(): string {
    const name =
      this._context.prefixName ||
      getAbiFileLocationRawName(this._context.inputPath)

    const outputDir = this.getOutputPathDirectory()

    if (outputDir.substring(outputDir.length - 1) === '/') {
      return `${outputDir}${name}.ts`
    }

    return buildExecutingPath(`${outputDir}/${name}.ts`)
  }

  /**
   * Build the full typings
   * @param abi The abi items
   * @param abiTypedInterface The abi typed interface
   */
  private buildFullTypings({
    abi,
    abiTypedInterface,
  }: {
    abi: AbiItem[]
    abiTypedInterface: string
  }): string {
    const { library, libraryImportAlias, verbatimModuleSyntax } =
      this._context ?? {}

    let typings = ''

    switch (library) {
      case 'web3':
        typings += this._web3Factory.buildInterfaces({
          abiName: this.getAbiName(),
          library,
          libraryImportAlias,
          verbatimModuleSyntax,
        })
        break
      case 'ethers_v4':
      case 'ethers_v5':
      case 'ethers_v6':
        typings += this._ethersFactory.buildInterfaces({
          abiName: this.getAbiName(),
          library,
          libraryImportAlias,
          verbatimModuleSyntax,
        })
        break
      default:
        throw new Error(`${library} is not a known supported library`)
    }

    return (
      typings +
      this.buildEventsType() +
      this.buildEventsInterface(abi) +
      this.buildMethodNamesType() +
      this.buildParametersAndReturnTypeInterfaces() +
      abiTypedInterface
    )
  }

  /**
   * Generate the common.types.ts file
   */
  private async generateCommonTypesFile(): Promise<void> {
    const { library, verbatimModuleSyntax, libraryImportAlias } = this._context

    let importType = ''

    switch (library) {
      case 'web3':
        importType = `import${verbatimModuleSyntax ? ' type' : ''} { BigNumber } from 'bignumber.js'
        import${verbatimModuleSyntax ? ' type' : ''} BN from 'bn.js'
        import${verbatimModuleSyntax ? ' type' : ''} { PromiEvent, TransactionReceipt } from "@ethereum-abi-types-generator/converter-typescript";`
        break
      case 'ethers_v4':
        importType = `import${verbatimModuleSyntax ? ' type' : ''} { BigNumber } from '${libraryImportAlias || 'ethers'}/utils'`
        break
      case 'ethers_v5':
        importType = `import${verbatimModuleSyntax ? ' type' : ''} { BigNumber } from '${libraryImportAlias || 'ethers'}'`
        break
      case 'ethers_v6':
        // V6 uses bigint
        break
    }

    let content = ''

    switch (library) {
      case 'web3':
        content = `export type CallOptions = {
  from?: string
  gasPrice?: string
  gas?: number
}

export type SendOptions = {
  from: string
  value?: number | string | BN | BigNumber
  gasPrice?: string
  gas?: number
}

export type EstimateGasOptions = {
  from?: string
  value?: number | string | BN | BigNumber
  gas?: number
}

export type MethodPayableReturnContext = {
  send(options: SendOptions): PromiEvent<TransactionReceipt>
  send(
    options: SendOptions,
    callback: (error: Error, result: any) => void,
  ): PromiEvent<TransactionReceipt>
  estimateGas(options: EstimateGasOptions): Promise<number>
  estimateGas(
    options: EstimateGasOptions,
    callback: (error: Error, result: any) => void,
  ): Promise<number>
  encodeABI(): string
}

export type MethodConstantReturnContext<TCallReturn> = {
  call(): Promise<TCallReturn>
  call(options: CallOptions): Promise<TCallReturn>
  call(
    options: CallOptions,
    callback: (error: Error, result: TCallReturn) => void,
  ): Promise<TCallReturn>
  encodeABI(): string
}

export type MethodReturnContext = MethodPayableReturnContext`
        break
      case 'ethers_v4':
      case 'ethers_v5':
      case 'ethers_v6':
        content = `export declare type EventFilter = {
      address?: string;
      topics?: string[];
      fromBlock?: string | number;
      toBlock?: string | number;
    };

    export type ContractTransactionOverrides = {
      /**
       * The maximum units of gas for the transaction to use
       */
      gasLimit?: number;
      /**
       * The price (in wei) per unit of gas
       */
      gasPrice?: ${library === libraryMap.ethers_v6 ? 'bigint' : 'BigNumber'} | string | number | Promise<any>;
      /**
       * The nonce to use in the transaction
       */
      nonce?: number;
      /**
       * The amount to send with the transaction (i.e. msg.value)
       */
      value?: ${library === libraryMap.ethers_v6 ? 'bigint' : 'BigNumber'} | string | number | Promise<any>;
      /**
       * The chain ID (or network ID) to use
       */
      chainId?: number;
    }

    export type ContractCallOverrides = {
      /**
       * The address to execute the call as
       */
      from?: string;
      /**
       * The maximum units of gas for the transaction to use
       */
      gasLimit?: number;
    }`
        break
    }

    const commonTypesContent = `${importType}
    
    ${content}`

    const outputDir = this.getOutputPathDirectory()
    const commonTypesPath = path.join(outputDir, 'common-types.ts')
    // const formattedContent = await formatAndLintCode(
    //   commonTypesContent,
    //   this._context.eslintOptions,
    //   this._context.eslintConfigPath,
    //   this._context.prettierOptions,
    //   this._context.prettierConfigPath,
    // )

    fs.writeFileSync(commonTypesPath, commonTypesContent, {
      mode: 0o755,
    })
  }

  /**
   * Gets the abi json
   */
  private getAbiJson(): AbiItem[] {
    try {
      const result = JSON.parse(this._context.inputFile)

      if (result.abi) {
        return result.abi
      }

      return result as AbiItem[]
    } catch (error) {
      throw new Error(`Provided ABI content is not a valid JSON object.`)
    }
  }

  /**
   * Get the abi file full path location with executing path
   */
  private getAbiFileFullPathLocation(): string {
    return buildExecutingPath(this._context.inputPath)
  }

  /**
   * Build abi interface
   * @param abi The abi json
   */
  private buildAbiInterface(abi: AbiItem[]): string {
    let properties = ''

    for (let i = 0; i < abi.length; i++) {
      switch (abi[i].type) {
        case abiItemsMap.constructor:
          properties += this.buildInterfacePropertyDocs(abi[i])
          this._methodNames.push('new')
          properties += `'new'${this.buildParametersAndReturnTypes(abi[i])};`
          break

        case abiItemsMap.function:
          properties += this.buildInterfacePropertyDocs(abi[i])
          this._methodNames.push(abi[i].name)
          properties += `${abi[i].name}${this.buildParametersAndReturnTypes(abi[i])};`
          break

        case abiItemsMap.event:
          const eventInputs = abi[i].inputs

          if (eventInputs && eventInputs.length > 0) {
            const eventInterfaceName = `${capitalize(abi[i].name)}EventEmittedResponse`

            let eventTypeProperties = ''

            for (let e = 0; e < eventInputs.length; e++) {
              const eventTsType = TypeScriptHelpers.getSolidityInputTsType({
                abiInput: eventInputs[e],
                library: this._context.library,
                suffix: 'EventEmittedResponse',
              })

              eventTypeProperties += `${eventInputs[e].name || `param${e}`}: ${eventTsType};`

              if (eventInputs[e].type === solidityTypeMap.tuple) {
                this.buildTupleParametersInterface({
                  nameOverride: `event_${abi[i].name}`,
                  abiInput: eventInputs[e],
                  suffix: 'EventEmittedResponse',
                })
              }
            }

            this.addReturnTypeInterface({
              interfaceName: eventInterfaceName,
              interfaceContext: eventTypeProperties,
            })
          }

          this._events.push(abi[i].name)

          break
      }
    }

    return TypeScriptHelpers.buildInterface(this.getAbiName(), properties)
  }

  /**
   * Get abi name
   */
  private getAbiName(force: boolean = false): string {
    if (!force && (!this._context.prefixTypes || this._context.prefixTypes)) {
      return ''
    }

    if (this._context.prefixName) {
      return formatAbiName(this._context.prefixName)
    }

    return formatAbiName(getAbiFileLocationRawName(this._context.inputPath))
  }

  /**
   * Build method names types
   */
  private buildMethodNamesType(): string {
    // Makes a type with all the method names as strings
    const methodNamesType = TypeScriptHelpers.buildType(
      `${this.getAbiName()}MethodNames`,
      Array.from(new Set(this._methodNames)),
    )

    // Makes a mapping type for the method names
    const methodNameMap = `export type ${this.getAbiName()}MethodNameMap = {
      [key in ${this.getAbiName()}MethodNames]: string;
    };`

    return `${methodNamesType}\n${methodNameMap}`
  }

  /**
   * Build the parameters and return type interface if they accept an object of some form
   */
  private buildParametersAndReturnTypeInterfaces(): string {
    let parametersAndReturnTypes = ''

    this._parametersAndReturnTypeInterfaces.map((typeInterface) => {
      parametersAndReturnTypes += typeInterface
    })

    return parametersAndReturnTypes
  }

  /**
   * Build events type
   */
  private buildEventsType(): string {
    return TypeScriptHelpers.buildType(
      `${this.getAbiName()}Events`,
      this._events,
    )
  }

  /**
   * Build the event context interface
   * @param abiName The abi name
   * @param abiItems The abi json
   */
  private buildEventsInterface(abiItems: AbiItem[]): string {
    const eventsInterfaceName = `${this.getAbiName()}EventsContext`

    switch (this._context.library) {
      case 'web3':
        return TypeScriptHelpers.buildInterface(
          eventsInterfaceName,
          this._web3Factory.buildEventInterfaceProperties({ abiItems }),
        )
      case 'ethers_v4':
      case 'ethers_v5':
      case 'ethers_v6':
        return TypeScriptHelpers.buildInterface(
          eventsInterfaceName,
          this._ethersFactory.buildEventInterfaceProperties({ abiItems }),
        )
      default:
        throw new Error(
          `${this._context.library} is not a known supported library. Supported libraries are ${libraryTypes.join(
            ', ',
          )}`,
        )
    }
  }

  /**
   * Build the abi property summaries
   * @param abiItem The abi json
   */
  private buildInterfacePropertyDocs(abiItem: AbiItem): string {
    let paramsDocs = ''

    if (abiItem.inputs) {
      for (let i = 0; i < abiItem.inputs.length; i++) {
        let inputName = abiItem.inputs[i].name
        // handle mapping inputs
        if (inputName.length === 0) {
          inputName = `parameter${i}`
        }

        paramsDocs += `\r\n* @param ${inputName} Type: ${
          abiItem.inputs[i].type
        }, Indexed: ${abiItem.inputs[i].indexed || 'false'}`
      }
    }

    return `
         /**
            * Payable: ${isAcceptsEther(abiItem)}
            * Constant: ${isNeverModifyBlockchainState(abiItem)}
            * StateMutability: ${abiItem.stateMutability}
            * Type: ${abiItem.type} ${paramsDocs}
          */
        `
  }

  /**
   * Builds the input and output property type
   * @param abiItem The abi json
   */
  private buildParametersAndReturnTypes(abiItem: AbiItem): string {
    const parameters = this.buildParameters(abiItem)
    return `${parameters}${this.buildPropertyReturnTypeInterface(abiItem)}`
  }

  /**
   * Build parameters for abi interface
   * @param abiItem The abi item
   */
  private buildParameters(abiItem: AbiItem): string {
    let input = '('
    if (abiItem.inputs) {
      for (let i = 0; i < abiItem.inputs.length; i++) {
        if (input.length > 1) {
          input += ', '
        }

        let inputName = abiItem.inputs[i].name
        // handle mapping inputs
        if (inputName.length === 0) {
          inputName = `parameter${i}`
        }

        if (abiItem.inputs[i].type.includes(solidityTypeMap.tuple)) {
          input += `${inputName}: ${this.buildTupleParametersInterface({
            nameOverride: inputName,
            abiInput: abiItem.inputs[i],
            suffix: 'Request',
            methodName: abiItem.name,
          })}`
        } else {
          input += `${inputName}: ${TypeScriptHelpers.getSolidityInputTsType({
            abiInput: abiItem.inputs[i],
            library: this._context.library,
            suffix: 'Request',
          })}`
        }
      }
    }

    // Ethers allows you to pass in overrides in methods so add that in here
    if (isEthersLibrary(this._context.library)) {
      input = this._ethersFactory.addOverridesToParameters({
        parameters: input,
        abiItem,
      })
    }

    return (input += ')')
  }

  /**
   * Build the object request parameter interface
   * @param nameOverride The abi item name
   * @param abiInput The abi input
   * @param suffix The suffix
   * @param methodName The method name
   */
  private buildTupleParametersInterface({
    abiInput,
    nameOverride,
    suffix,
    methodName,
  }: {
    abiInput: AbiInput
    nameOverride: string
    suffix?: 'Request' | 'Response' | 'EventEmittedResponse'
    methodName?: string
  }): string {
    const interfaceName = TypeScriptHelpers.buildInterfaceName({
      inputOrOutput: abiInput,
      nameOverride,
      suffix,
      methodName,
    })

    let properties = ''

    // Iterate over all components in the tuple
    for (let i = 0; i < abiInput.components!.length; i++) {
      const isNestedTuple = !!abiInput.components![i].components

      if (isNestedTuple) {
        const componentName = abiInput.components![i].name || `result${i}`

        // Make a new interface for the nested tuple
        const nestedInterfaceName = this.buildTupleParametersInterface({
          nameOverride: componentName,
          abiInput: abiInput.components![i],
          suffix,
          methodName,
        })

        // Add the nested tuple as a property to the current interface
        properties += `${componentName}: ${nestedInterfaceName};`
      } else {
        const inputTsType = TypeScriptHelpers.getSolidityInputTsType({
          abiInput: abiInput.components![i],
          library: this._context.library,
          suffix: 'Request',
          methodName,
        })

        // Add the property to the current interface
        properties += `${abiInput.components![i].name}: ${inputTsType};`
      }
    }

    // Add the interface to the return types
    this.addReturnTypeInterface({
      interfaceName,
      interfaceContext: properties,
    })

    if (abiInput.type.includes('[')) {
      return `${interfaceName}[]`
    }

    return interfaceName
  }

  /**
   * Build the object response parameter interface
   * @param name The abi item name
   * @param abiOutput The abi output
   */
  private buildTupleResponseInterface({
    abiOutput,
    methodName,
  }: {
    abiOutput: AbiOutput
    methodName?: string
  }): string {
    const interfaceName = TypeScriptHelpers.buildInterfaceName({
      inputOrOutput: abiOutput,
      suffix: 'Response',
      methodName,
    })

    let properties = ''

    // Iterate over all components in the tuple
    for (let i = 0; i < abiOutput.components!.length; i++) {
      const isNestedTuple = !!abiOutput.components![i].components

      // check for deep tuples in tuple in tuples
      if (isNestedTuple) {
        const componentName = abiOutput.components![i].name || `result${i}`

        // Make a new interface for the nested tuple
        const nestedInterfaceName = this.buildTupleResponseInterface({
          abiOutput: abiOutput.components![i],
          // methodName,
        })

        // Add the nested tuple as a property to the current interface
        properties += `${componentName}: ${nestedInterfaceName};`

        // Add a prop with the name as the index to the current interface
        if (isEthersLibrary(this._context.library)) {
          properties += `${i}: ${nestedInterfaceName};`
        }
      } else {
        const outputTsType = TypeScriptHelpers.getSolidityOutputTsType({
          abiOutput: abiOutput.components![i],
          library: this._context.library,
        })

        // Add the property to the current interface
        properties += `${abiOutput.components![i].name}: ${outputTsType};`

        // Add a prop with the name as the index to the current interface
        if (isEthersLibrary(this._context.library)) {
          properties += `${i}: ${outputTsType};`
        }
      }
    }

    // Add the interface to the return types
    this.addReturnTypeInterface({ interfaceName, interfaceContext: properties })

    if (abiOutput.type.includes('[')) {
      return `${interfaceName}[]`
    }

    return `${interfaceName}`
  }

  /**
   * Build property return type interface and return the return type context
   * @param abiItem The abi json
   */
  private buildPropertyReturnTypeInterface(abiItem: AbiItem): string {
    let output = ''

    if (abiItem.outputs && abiItem.outputs.length > 0) {
      if (abiItem.outputs.length === 1) {
        output += this.buildMethodReturnContext({
          abiName: this.getAbiName(),
          type: TypeScriptHelpers.getSolidityOutputTsType({
            abiOutput: abiItem.outputs[0],
            library: this._context.library,
          }),
          abiItem,
        })

        if (abiItem.outputs[0].type.includes(solidityTypeMap.tuple)) {
          this.buildTupleResponseInterface({
            abiOutput: abiItem.outputs[0],
            methodName: abiItem.name,
          })
        }
      } else {
        if (isNeverModifyBlockchainState(abiItem)) {
          const interfaceName = TypeScriptHelpers.buildInterfaceName({
            inputOrOutput: abiItem,
          })

          let outputProperties = ''

          for (let i = 0; i < abiItem.outputs.length; i++) {
            const abiItemOutput = abiItem.outputs[i]

            const outputTsType = TypeScriptHelpers.getSolidityOutputTsType({
              abiOutput: abiItemOutput,
              library: this._context.library,
            })

            let propertyName = abiItemOutput.name
            if (propertyName.length === 0) {
              propertyName = `result${i}`
            }

            outputProperties += `${propertyName}: ${outputTsType};`

            if (isEthersLibrary(this._context.library)) {
              outputProperties += `${i}: ${outputTsType};`
            }

            if (abiItemOutput.type.includes(solidityTypeMap.tuple)) {
              this.buildTupleResponseInterface({
                abiOutput: abiItem.outputs[i],
                methodName: abiItem.name,
              })
            }
          }

          if (isEthersLibrary(this._context.library)) {
            outputProperties += `length: ${abiItem.outputs.length};`
          }

          this.addReturnTypeInterface({
            interfaceName,
            interfaceContext: outputProperties,
          })

          output += this.buildMethodReturnContext({
            abiName: this.getAbiName(),
            type: interfaceName,
            abiItem,
          })
        } else {
          // if its not a constant you will have no type so don't build any interfaces
          output += this.buildMethodReturnContext({
            abiName: this.getAbiName(),
            type: '',
            abiItem,
          })
        }
      }
    } else {
      output += this.buildMethodReturnContext({
        abiName: this.getAbiName(),
        type: 'void',
        abiItem,
      })
    }

    return output
  }

  /**
   * add return type interfaces
   * @param interfaceName The interface name
   * @param interfaceContext The interface context
   */
  private addReturnTypeInterface({
    interfaceName,
    interfaceContext,
  }: {
    interfaceName: string
    interfaceContext: string
  }): void {
    // filter out any repeated interfaces
    if (
      !this._parametersAndReturnTypeInterfaces.find((c) =>
        c.includes(`export interface ${interfaceName}`),
      )
    ) {
      this._parametersAndReturnTypeInterfaces.push(
        TypeScriptHelpers.buildInterface(interfaceName, interfaceContext),
      )
    }
  }

  /**
   * Build the method return context
   * @param options - The options for building the method return context
   * @param options.abiName - The ABI name
   * @param options.type - The type it returns
   * @param options.abiItem - The ABI item
   * @returns The method return context as a string
   */
  private buildMethodReturnContext({
    abiName,
    type,
    abiItem,
  }: {
    abiName: string
    type: string
    abiItem: AbiItem
  }): string {
    switch (this._context.library) {
      case 'web3':
        return this._web3Factory.buildMethodReturnContext({
          abiName,
          type,
          abiItem,
        })
      case 'ethers_v4':
      case 'ethers_v5':
      case 'ethers_v6':
        return this._ethersFactory.buildMethodReturnContext({
          abiName,
          type,
          abiItem,
        })
      default:
        throw new Error(
          `${this._context.library} is not a known supported library`,
        )
    }
  }
}
