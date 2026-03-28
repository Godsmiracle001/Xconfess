import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TipButton } from "@/app/components/confession/TipButton";
import { useWallet } from "@/lib/hooks/useWallet";
import {
  sendTip,
  verifyTip,
  getTipStats,
} from "@/lib/services/tipping.service";

jest.mock("@/lib/hooks/useWallet", () => ({
  useWallet: jest.fn(),
}));

jest.mock("@/lib/services/tipping.service", () => ({
  sendTip: jest.fn(),
  verifyTip: jest.fn(),
  getTipStats: jest.fn(),
}));

const mockUseWallet = useWallet as jest.MockedFunction<typeof useWallet>;
const mockSendTip = sendTip as jest.MockedFunction<typeof sendTip>;
const mockVerifyTip = verifyTip as jest.MockedFunction<typeof verifyTip>;
const mockGetTipStats = getTipStats as jest.MockedFunction<typeof getTipStats>;

function renderTipButton() {
  return render(
    <TipButton
      confessionId="confession-123"
      recipientAddress="GABCDEFGHIJKLMNOPQRSTUV1234567890ABCDEFGHIJKLMNOPQRSTUV"
    />,
  );
}

describe("TipButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWallet.mockReturnValue({
      publicKey: "GSENDERPUBLICKEY1234567890ABCDEFGHIJKLMNOPQRSTUVWX",
      network: "TESTNET_SOROBAN",
      isConnected: true,
      isLoading: false,
      error: null,
      isFreighterInstalled: true,
      isReady: true,
      readinessError: null,
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
      signTransaction: jest.fn().mockResolvedValue("signed-xdr"),
      checkConnection: jest.fn().mockResolvedValue(undefined),
      switchNetwork: jest.fn(),
      clearError: jest.fn(),
    });
    mockGetTipStats.mockResolvedValue({
      totalAmount: 0,
      totalCount: 0,
      averageAmount: 0,
    });
  });

  it("completes a successful tip and verification flow", async () => {
    const user = userEvent.setup();
    mockSendTip.mockResolvedValue({ success: true, txHash: "tx-success-1" });
    mockVerifyTip.mockResolvedValue({ success: true, tip: undefined });

    renderTipButton();

    await user.click(screen.getByRole("button", { name: /tip confession/i }));
    await user.click(screen.getByRole("button", { name: /send 0.1 xlm tip/i }));

    await waitFor(() => {
      expect(mockSendTip).toHaveBeenCalledWith(
        "confession-123",
        0.1,
        "GABCDEFGHIJKLMNOPQRSTUV1234567890ABCDEFGHIJKLMNOPQRSTUV",
      );
    });
    expect(mockVerifyTip).toHaveBeenCalledWith("confession-123", "tx-success-1");
    expect(
      await screen.findByText(/tip sent successfully/i),
    ).toBeInTheDocument();
  });

  it("shows a clear rejection message when wallet signing is rejected", async () => {
    const user = userEvent.setup();
    mockSendTip.mockResolvedValue({
      success: false,
      error: "Transaction was rejected in your wallet. Review details and retry when ready.",
    });

    renderTipButton();

    await user.click(screen.getByRole("button", { name: /tip confession/i }));
    await user.click(screen.getByRole("button", { name: /send 0.1 xlm tip/i }));

    expect(
      await screen.findByText(/transaction was rejected in your wallet/i),
    ).toBeInTheDocument();
    expect(mockVerifyTip).not.toHaveBeenCalled();
  });

  it("shows timeout recovery guidance", async () => {
    const user = userEvent.setup();
    mockSendTip.mockResolvedValue({
      success: false,
      error: "Wallet request timed out. Open Freighter, approve if pending, then retry.",
    });

    renderTipButton();

    await user.click(screen.getByRole("button", { name: /tip confession/i }));
    await user.click(screen.getByRole("button", { name: /send 0.1 xlm tip/i }));

    expect(
      await screen.findByText(/wallet request timed out/i),
    ).toBeInTheDocument();
  });

  it("supports replay-safe verification retry without re-sending tip", async () => {
    const user = userEvent.setup();
    mockSendTip.mockResolvedValue({ success: true, txHash: "tx-retry-1" });
    mockVerifyTip
      .mockResolvedValueOnce({ success: false, error: "temporary backend timeout" })
      .mockResolvedValueOnce({ success: true, tip: undefined });

    renderTipButton();

    await user.click(screen.getByRole("button", { name: /tip confession/i }));
    await user.click(screen.getByRole("button", { name: /send 0.1 xlm tip/i }));

    expect(
      await screen.findByText(/backend verification is still pending/i),
    ).toBeInTheDocument();
    expect(mockVerifyTip).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /retry verification/i }));

    await waitFor(() => {
      expect(mockVerifyTip).toHaveBeenCalledTimes(2);
    });
    expect(mockSendTip).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByText(/tip sent successfully/i),
    ).toBeInTheDocument();
  });
});
