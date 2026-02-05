import { useState } from 'react';
import { useWalletStore } from '../store';
import { ArrowLeft, Copy, Check, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface ReceiveProps {
  onBack: () => void;
}

export default function Receive({ onBack }: ReceiveProps) {
  const { currentAddress, network, accounts } = useWalletStore();
  const [copied, setCopied] = useState(false);

  const currentAccount = accounts.find(a => a.address === currentAddress);

  const copyAddress = async () => {
    if (currentAddress) {
      await navigator.clipboard.writeText(currentAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareAddress = async () => {
    if (currentAddress && 'share' in navigator) {
      try {
        await navigator.share({
          title: 'My QFC Address',
          text: currentAddress,
        });
      } catch {
        // User cancelled or share not supported
      }
    }
  };

  if (!currentAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-qfc-50 to-blue-50 flex items-center justify-center">
        <p className="text-gray-500">No wallet connected</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-qfc-50 to-blue-50 p-4">
      <div className="max-w-sm mx-auto">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-2 text-center">Receive {network.symbol}</h2>
          <p className="text-gray-500 text-sm text-center mb-6">
            Scan QR code or copy address below
          </p>

          {/* QR Code */}
          <div className="flex justify-center mb-6">
            <div className="bg-white p-4 rounded-xl border-2 border-gray-100">
              <QRCodeSVG
                value={currentAddress}
                size={180}
                level="H"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
          </div>

          {/* Account Info */}
          <div className="text-center mb-4">
            <p className="text-sm text-gray-500">{currentAccount?.name || 'Account'}</p>
          </div>

          {/* Address Display */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-xs text-gray-500 mb-1">Your Address</p>
            <p className="font-mono text-sm break-all text-gray-800">
              {currentAddress}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={copyAddress}
              className="flex-1 py-3 bg-gradient-to-r from-qfc-500 to-blue-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  Copy Address
                </>
              )}
            </button>

            {'share' in navigator && (
              <button
                onClick={shareAddress}
                className="py-3 px-4 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Network Info */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
              Only send {network.symbol} ({network.name}) to this address
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
