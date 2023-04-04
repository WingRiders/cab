/* eslint-disable max-len */
const enum Errors {
  HwTransportNotFoundError = 'Error occured while trying to find hw transport, make sure Ledger or Trezor is connected to you computer',
  InvalidPathError = 'Can not parse path',
  InvalidFileTypeError = 'Invalid file type of hw-signing-file',
  InvalidHwSigningFileError = 'Invalid file contents of hw-signing-file',
  InvalidTxBodyFileError = 'Invalid file contents of tx-body-file',
  TxSerializationMismatchError = 'Tx serialization mismatch',
  MissingHwSigningDataAtPathError = 'Can not find hw signing data',
  MultipleWitnessesError = 'Multiple witnesses found',
  UndefinedCommandError = 'command undefined',
  MissingSigningFileError = 'missing signing file',
  UnknownCertificateTypeError = 'unknown certificate type',
  MultipleCertificatesWithPoolRegError = 'Multiple pool registration certificates found, expected one',
  WithdrawalIncludedWithPoolRegError = 'Withdrawal certificate and pool registration certificate found, expected one',
  PaymentFileInlucedWithPoolRegError = 'Unexpected payment hardware signing file with pool registration certificate found',
  MultipleStakingSigningFilesWithPoolRegError = 'Multiple staking signing files with pool registration certificate found, expected only one staking signing file',
  MissingPaymentSigningFileError = 'Missing payment hardware signing file',
  TooManySigningFilesError = 'Too many signing files',
  MissingStakingSigningFileError = 'Missing staking signing file',
  MissingInputError = 'Missing input',
  MissingOutputError = 'Missing output',
  TrezorError = 'Trezor operation failed, please make sure you are using the latest version of Trezor firmware',
  TxInputParseError = 'Failed to parse input',
  TxOutputParseArrayError = 'Failed to parse output: not an array',
  TxOutputParseCoinError = 'Failed to parse output: not a number',
  TxMultiAssetPolicyIdParseError = 'Failed to parse multi asset policy id: not a buffer',
  TxAssetParseError = 'Failed to parse asset: not a buffer',
  TxAssetNameParseError = 'Failed to parse asset name: not a buffer',
  TxMultiAssetParseError = 'Failed to parse multiasset: not a map',
  TxMultiAssetAmountParseError = 'Failed to parse multiasset amount: not a number',
  WithrawalsParseError = 'Failed to parse withdrawals',
  TxStakingKeyRegistrationCertParseError = 'Failed to parse staking key registration certificate',
  TxStakingKeyDeregistrationCertParseError = 'Failed to parse staking key deregistration certificate',
  TxDelegationCertParseError = 'Failed to parse delegation certificate',
  TxStakepoolRegistrationCertParseError = 'Failed to parse stakepool registration certificate',
  TxSingleHostIPRelayParseError = 'Failed to parse single host IP relay',
  TxSingleHostNameRelayParseError = 'Failed to parse single host name relay',
  TxMultiHostNameRelayParseError = 'Failed to parse multi host name relay',
  ValidityIntervalStartParseError = 'Failed to parse validity internal start: not a number',
  MissingSigningFileForCertificateError = 'Missing signing file for certificate',
  OwnerMultipleTimesInTxError = 'Owner multiple times in tx',
  UnsupportedRelayTypeError = 'Unsupported relay type',
  UnknownCertificateError = 'Unknown certificate',
  UnsupportedCertificateTypeError = 'Unsupported certificate type',
  MissingSigningFileForWithdrawalError = 'Missing signing file for withdrawal',
  CantSignTxWithPoolRegError = 'Cannot sign transaction with pool registration, use "witness" subcommand instead',
  CantWitnessTxWithoutPoolRegError = 'Cannot create separate witness for transaction other than pool registration, use "sign" subcommand instead',
  InvalidAddressError = 'Invalid address',
  LedgerOperationError = 'Ledger operation error',
  InvalidAddressParametersProvidedError = 'Invalid address parameters provided',
  InvalidKeyGenInputsError = 'Invalid key gen inputs error',
  TrezorPassphraseNotInsertableOnDevice = 'Trezor passphrase not insertable on the device',
  FeeParseError = 'Failed to parse transaction, fee is not a number',
  TTLParseError = 'Failed to parse transaction, TTL is not a number',
  InvalidTransactionBody = 'Transaction body contains invalid or unsuported key',
  MintUnsupportedError = 'Minting is unsupported in current version',
  MultiAssetNotSupported = 'Transaction contains multi-asset, please update your device firmware',
  TrezorValidityIntervalStartNotSupported = 'The current version of your trezor firmware does not support validity interval start. Update your device firmware to the latest version.',
  LedgerValidityIntervalStartNotSupported = 'The current version of your Ledger Cardano app does not support validity interval start. Update your Cardano app to the latest version.',
  TrezorOptionalTTLNotSupported = 'The current version of your trezor firmware does not support optional TTL. Update your device firmware to the latest version.',
  LedgerOptionalTTLNotSupported = 'The current version of your Ledger Cardano app does not support multi asset transactions. Update your Cardano app to the latest version.',
  TrezorMultiAssetsNotSupported = 'The current version of your trezor firmware does not support multi asset transactions. Update your device firmware to the latest version.',
  LedgerMultiAssetsNotSupported = 'The current version of your Ledger Cardano app does not support multi asset transactions. Update your Cardano app to the latest version.',
  TrezorXPubKeyCancelled = 'Extended public key export cancelled by user',
  MetaDataHashParseError = 'Failed to parse transaction, metadata hash is not a Buffer.',
  AssetNameParseError = 'Failed to parse transaction, asset name is not a Buffer.',
  AssetAmountParseError = 'Failed to parse transaction, asset amount is not a valid number.',
  PolicyIdParseError = 'Failed to parse transaction, multi asset policy id is not a Buffer.',
}

export {Errors}