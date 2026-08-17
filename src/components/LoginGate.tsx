interface LoginGateProps {
  onLogin: () => void;
}

export default function LoginGate({ onLogin }: LoginGateProps) {
  return (
    <div className="gate">
      <div className="gate-card">
        <span className="wordmark">
          <span className="dot" />
          Approvals Console
        </span>
        <p className="gate-text">
          Invite-only reviewer console. Sign in with your Netlify Identity
          account to see the pending queue.
        </p>
        <button className="btn btn-approve gate-btn" onClick={onLogin}>
          Sign in
        </button>
      </div>
    </div>
  );
}
