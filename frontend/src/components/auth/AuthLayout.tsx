type Props = {
  left: React.ReactNode;
  right: React.ReactNode;
};

export default function AuthLayout({ left, right }: Props) {
  return (
    <div className="auth-page">
      <div className="auth-shell">
        <section className="auth-panel auth-panel-left">{left}</section>
        <section className="auth-panel auth-panel-right">{right}</section>
      </div>
    </div>
  );
}
