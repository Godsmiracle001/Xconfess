// src/stellar/utils/stellar-error.handler.ts
// Centralized error handler for Stellar/Soroban integration

export class StellarTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StellarTimeoutError';
  }
}

export class StellarInvalidSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StellarInvalidSignatureError';
  }
}

export class StellarMalformedTransactionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StellarMalformedTransactionError';
  }
}

export class StellarNetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StellarNetworkError';
  }
}

export function handleStellarError(error: any): Error {
  // Map specific error messages
  const errorMsg = error.message?.toLowerCase() || '';
  if (errorMsg.includes('timeout')) {
    return new StellarTimeoutError('Stellar transaction timed out');
  }
  if (errorMsg.includes('signature') || errorMsg.includes('bad_auth')) {
    return new StellarInvalidSignatureError(
      'Invalid Stellar transaction signature',
    );
  }
  if (errorMsg.includes('tx_bad_seq') || errorMsg.includes('malformed')) {
    return new StellarMalformedTransactionError(
      'Malformed Stellar transaction',
    );
  }

  // Map result codes from horizon
  if (error.response?.data?.extras?.result_codes) {
    const codes = error.response.data.extras.result_codes;
    const txCode = codes.transaction;

    if (txCode === 'tx_bad_auth') {
      return new StellarInvalidSignatureError(
        'Invalid Stellar transaction signature',
      );
    }
    if (txCode === 'tx_bad_seq' || txCode === 'tx_malformed') {
      return new StellarMalformedTransactionError(
        'Malformed Stellar transaction',
      );
    }

    return new StellarNetworkError(`Stellar error: ${JSON.stringify(codes)}`);
  }

  if (error.response?.data?.detail) {
    return new StellarNetworkError(
      `Stellar error: ${error.response.data.detail}`,
    );
  }

  return new StellarNetworkError(`Stellar error: ${error.message || error}`);
}
