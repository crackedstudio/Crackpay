export default function Offline() {
  return (
    <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-lg font-semibold">You&apos;re offline</h1>
      <p className="text-sm opacity-70">
        CrackPay needs a connection to show your balance and send money.
      </p>
    </main>
  );
}
