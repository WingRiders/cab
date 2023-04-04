export enum UnexpectedErrorReason {
  UnsupportedOperationError = 'UnsupportedOperationError',
  ParamsValidationError = 'ParamsValidationError',
  InvalidCertificateType = 'InvalidCertificateType',
  InvalidCertificateAddress = 'InvalidCertificateAddress',
  AccountExplorationError = 'AccountExplorationError',
  BulkExportCreationError = 'BulkExportCreationError',
  InvalidTxPlanType = 'InvalidTxPlanType',
  CborizeError = 'CborizeError',
  InvalidRelayType = 'InvalidRelayType',
  CannotConstructTxPlan = 'CannotConstructTxPlan',
}

export enum UnexpectedErrorSubCode {
  InsufficientAda = 'InsufficientAda',
}
