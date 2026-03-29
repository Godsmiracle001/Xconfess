import {
  freighterGetPublicKey,
  freighterSignTransaction,
  getFreighterClient,
  isFreighterInstalled,
} from "@/lib/wallet/freighterAdapter";
import { Networks } from "@stellar/stellar-sdk";

describe("freighterAdapter", () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).freighter;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).freighterApi;
  });

  it("prefers freighterApi over freighter when both exist", async () => {
    const api = { getPublicKey: jest.fn().mockResolvedValue("GAPI") };
    const legacy = { getPublicKey: jest.fn().mockResolvedValue("GLEGACY") };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).freighter = legacy;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).freighterApi = api;

    await expect(freighterGetPublicKey()).resolves.toBe("GAPI");
    expect(api.getPublicKey).toHaveBeenCalledTimes(1);
    expect(legacy.getPublicKey).not.toHaveBeenCalled();
  });

  it("uses freighter when freighterApi is absent", async () => {
    const legacy = {
      getPublicKey: jest.fn().mockResolvedValue("GFREIGHTER"),
      getNetwork: jest.fn().mockResolvedValue("TESTNET_SOROBAN"),
      signTransaction: jest
        .fn()
        .mockImplementation((_xdr: string, opts: { network: string }) =>
          Promise.resolve(`signed:${opts.network}`),
        ),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).freighter = legacy;

    expect(getFreighterClient()).toBe(legacy);
    expect(isFreighterInstalled()).toBe(true);
    await expect(freighterGetPublicKey()).resolves.toBe("GFREIGHTER");
  });

  it("signTransaction tries passphrase-style options for Horizon-style txs", async () => {
    const signTransaction = jest
      .fn()
      .mockImplementationOnce(() => Promise.reject(new Error("bad shape")))
      .mockImplementationOnce((_xdr: string, passphrase: string) =>
        Promise.resolve(`ok:${passphrase.slice(0, 8)}`),
      );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).freighter = {
      getPublicKey: jest.fn(),
      getNetwork: jest.fn().mockResolvedValue("TESTNET_SOROBAN"),
      signTransaction,
    };

    const passphrase = Networks.TESTNET;
    const out = await freighterSignTransaction("AAA", passphrase);
    expect(out.startsWith("ok:")).toBe(true);
    expect(signTransaction).toHaveBeenCalled();
  });
});
