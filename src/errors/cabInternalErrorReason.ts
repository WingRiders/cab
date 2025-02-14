export enum CabInternalErrorReason {
  AccountNotDiscovered = 'AccountNotDiscovered',
  AccountNotLoaded = 'AccountNotLoaded',
  BadAuxiliaryData = 'BadAuxiliaryData',
  BadCollaterals = 'BadCollaterals',
  CoinAmountError = 'CoinAmountError',
  ChangeOutputTooSmall = 'ChangeOutputTooSmall',
  EpochBoundaryUnderway = 'EpochBoundaryUnderway',
  DatumTypeNotSupported = 'DatumTypeNotSupported',
  FailedToEvaluateTx = 'FailedToEvaluateTx',
  NetworkError = 'NetworkError',
  OutputTooSmall = 'OutputTooSmall',
  OutputTooBig = 'OutputTooBig',
  NumberTooBig = 'NumberTooBig',
  RewardsBalanceTooLow = 'RewardsBalanceTooLow',
  ServerError = 'ServerError',
  TokenNotFound = 'TokenNotFound',
  TransactionRejectedByNetwork = 'TransactionRejectedByNetwork',
  TransactionRejectedWhileSigning = 'TransactionRejectedWhileSigning',
  TransactionNotFoundInBlockchainAfterSubmission = 'TransactionNotFoundInBlockchainAfterSubmission',
  TransactionSubmissionTimedOut = 'TransactionSubmissionTimedOut',
  TxTooBig = 'TxTooBig',
  TxSignError = 'TxSignError',
  MaxTxExUnitsExceeded = 'MaxTxExUnitsExceeded',
  Error = 'Internal Error',
  Unsupported = 'Unsupported',
  /*
  SendAddressInvalidAddress = 'SendAddressInvalidAddress',
  SendAddressPoolId = 'SendAddressPoolId',
  TokenAmountOnlyWholeNumbers = 'TokenAmountOnlyWholeNumbers',
  TokenAmountInsufficientFunds = 'TokenAmountInsufficientFunds',
  SendTokenNotMinimalLovelaceAmount = 'SendTokenNotMinimalLovelaceAmount',
  DonationAmountTooLow = 'DonationAmountTooLow',
  DonationInsufficientBalance = 'DonationInsufficientBalance',
  InvalidStakepoolIdentifier = 'InvalidStakepoolIdentifier',
  TickerSearchDisabled = 'TickerSearchDisabled',
  DelegationBalanceError = 'DelegationBalanceError',
  InvalidMnemonic = 'InvalidMnemonic',
  TxSerializationError = 'TxSerializationError',
  TrezorSignTxError = 'TrezorSignTxError',
  TrezorError = 'TrezorError',
  LedgerOperationError = 'LedgerOperationError',
  CryptoProviderError = 'CryptoProviderError',
  LedgerMultiAssetNotSupported = 'LedgerMultiAssetNotSupported',
  LedgerOutdatedCardanoAppError = 'LedgerOutdatedCardanoAppError',
  LedgerWithdrawalNotSupported = 'LedgerWithdrawalNotSupported',
  LedgerPoolRegNotSupported = 'LedgerPoolRegNotSupported',
  LedgerCatalystNotSupported = 'LedgerCatalystNotSupported',
  LedgerBulkExportNotSupported = 'LedgerBulkExportNotSupported',
  TrezorPoolRegNotSupported = 'TrezorPoolRegNotSupported',
  TrezorMultiAssetNotSupported = 'TrezorMultiAssetNotSupported',
  PoolRegNoHwWallet = 'PoolRegNoHwWallet',
  MissingOwner = 'MissingOwner',
  TransactionCorrupted = 'TransactionCorrupted', // TODO: i dont think this should be expected
  */
}
