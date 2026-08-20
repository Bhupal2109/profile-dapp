import { useState, useCallback } from 'react';
import { connectWallet, type Providers } from './wallet';
import { joinContract, type DeployedContract } from './contract';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as string;
const NETWORK_ID = import.meta.env.VITE_NETWORK_ID as string;

type Status = 'idle' | 'connecting' | 'loading' | 'submitting' | 'error';

export default function App() {
  const [providers, setProviders] = useState<Providers | null>(null);
  const [contract, setContract] = useState<DeployedContract | null>(null);
  const [address, setAddress] = useState<string>('');
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [input, setInput] = useState<string>('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string>('');
  const [txId, setTxId] = useState<string>('');

  const refreshMessage = useCallback(async (c: DeployedContract) => {
    try {
      const msg = await c.readMessage();
      setCurrentMessage(msg);
    } catch {
      setCurrentMessage('(unable to read)');
    }
  }, []);

  const handleConnect = async () => {
    setStatus('connecting');
    setError('');
    setTxId('');
    try {
      const p = await connectWallet();
      setProviders(p);
      setAddress(p.address);
      setStatus('loading');
      const c = await joinContract(p);
      setContract(c);
      await refreshMessage(c);
      setStatus('idle');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus('error');
    }
  };

  const handleDisconnect = () => {
    setProviders(null);
    setContract(null);
    setAddress('');
    setCurrentMessage('');
    setInput('');   // clear any pending private input
    setTxId('');
    setStatus('idle');
    setError('');
  };

  const handleStoreMessage = async () => {
    if (!contract || !input.trim()) return;
    setStatus('submitting');
    setError('');
    setTxId('');
    const messageToStore = input.trim();
    try {
      const tx = await contract.callTx.storeMessage(messageToStore);
      // Clear private input immediately after successful submission
      setInput('');
      setTxId(tx?.public?.txId ?? '');
      await refreshMessage(contract);
      setStatus('idle');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // Do NOT include the private input in the error message
      setError(msg);
      setStatus('error');
    }
  };

  const isConnected = !!providers;
  const isBusy = status === 'connecting' || status === 'loading' || status === 'submitting';

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Hello World</h1>
        <p style={styles.subtitle}>Midnight Network · {NETWORK_ID}</p>

        {/* ── Wallet section ── */}
        <div style={styles.section}>
          {!isConnected ? (
            <button style={styles.btn} onClick={handleConnect} disabled={isBusy}>
              {status === 'connecting' ? '⏳ Connecting…' : 'Connect Lace Wallet'}
            </button>
          ) : (
            <div style={styles.row}>
              <span style={styles.addressBadge} title={address}>
                🟢 {address.slice(0, 22)}…{address.slice(-6)}
              </span>
              <button
                style={{ ...styles.btn, ...styles.btnSecondary }}
                onClick={handleDisconnect}
                disabled={isBusy}
              >
                Disconnect
              </button>
            </div>
          )}
        </div>

        {/* ── Contract info ── */}
        <div style={styles.section}>
          <p style={styles.label}>Contract address</p>
          <p style={styles.mono}>{CONTRACT_ADDRESS || '(not configured — set VITE_CONTRACT_ADDRESS)'}</p>
        </div>

        {/* ── Current on-chain message ── */}
        {isConnected && (
          <div style={styles.section}>
            <p style={styles.label}>Current on-chain message</p>
            {status === 'loading' ? (
              <p style={styles.dim}>⏳ Loading from chain…</p>
            ) : (
              <p style={styles.messageBox}>{currentMessage || '(empty)'}</p>
            )}
          </div>
        )}

        {/* ── Store message form ── */}
        {isConnected && status !== 'loading' && (
          <div style={styles.section}>
            <p style={styles.label}>Store a new message</p>
            <p style={styles.privacyNote}>
              🔒 <strong>Privacy:</strong> Your message is passed as a private circuit input and
              protected by a ZK proof during generation. The proof attests you know a valid input
              without revealing it to validators. Only the value explicitly disclosed via{' '}
              <code>disclose()</code> is written to the public ledger. The input field is cleared
              from the browser after successful submission.
            </p>
            <div style={styles.row}>
              <input
                style={styles.input}
                type="text"
                placeholder="Enter message…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isBusy && handleStoreMessage()}
                disabled={isBusy}
                autoComplete="off"
              />
              <button
                style={styles.btn}
                onClick={handleStoreMessage}
                disabled={isBusy || !input.trim()}
              >
                {status === 'submitting' ? '⏳ Submitting…' : 'Store'}
              </button>
            </div>
            {status === 'submitting' && (
              <p style={styles.dim}>Generating ZK proof and submitting via Lace…</p>
            )}
            {txId && status === 'idle' && (
              <p style={styles.success}>
                ✅ Stored! Tx: <span style={styles.mono}>{txId.slice(0, 20)}…</span>
              </p>
            )}
          </div>
        )}

        {/* ── Error display ── */}
        {error && (
          <div style={styles.errorBox}>
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '48px 16px',
    minHeight: '100vh',
  },
  card: {
    background: '#141414',
    border: '1px solid #2a2a2a',
    borderRadius: 12,
    padding: 32,
    width: '100%',
    maxWidth: 580,
  },
  title: { fontSize: 26, fontWeight: 700, marginBottom: 4, color: '#fff' },
  subtitle: { color: '#888', fontSize: 13, marginBottom: 28 },
  section: { marginBottom: 24 },
  label: {
    fontSize: 11,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  mono: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#aaa',
    wordBreak: 'break-all',
  },
  messageBox: {
    background: '#1e1e1e',
    borderRadius: 8,
    padding: '10px 14px',
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#e0e0e0',
    minHeight: 40,
  },
  privacyNote: {
    fontSize: 12,
    color: '#7bc',
    background: '#0d1a22',
    border: '1px solid #1a3a4a',
    borderRadius: 6,
    padding: '8px 12px',
    marginBottom: 12,
    lineHeight: 1.5,
  },
  row: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  btn: {
    background: '#7c3aed',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 20px',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  btnSecondary: { background: '#2a2a2a', color: '#ccc' },
  addressBadge: {
    fontFamily: 'monospace',
    fontSize: 12,
    background: '#0d1f0d',
    border: '1px solid #1a4a1a',
    borderRadius: 6,
    padding: '6px 10px',
    color: '#6c6',
  },
  input: {
    flex: 1,
    background: '#1e1e1e',
    border: '1px solid #333',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#e0e0e0',
    fontSize: 14,
    minWidth: 0,
    outline: 'none',
  },
  dim: { color: '#666', fontSize: 13, marginTop: 8 },
  success: { color: '#6c6', fontSize: 13, marginTop: 8 },
  errorBox: {
    background: '#2a0a0a',
    border: '1px solid #5a1a1a',
    borderRadius: 8,
    padding: '12px 16px',
    color: '#f88',
    fontSize: 13,
    marginTop: 8,
  },
};
