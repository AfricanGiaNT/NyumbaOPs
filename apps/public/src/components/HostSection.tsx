type HostSectionProps = {
  hostName?: string;
  yearsHosting?: number;
};

export function HostSection({ hostName = "Trevor", yearsHosting = 1 }: HostSectionProps) {
  return (
    <section className="flex items-center gap-3 border-b border-zinc-200 py-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
        {hostName.charAt(0).toUpperCase()}
      </div>
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Hosted by {hostName}</h2>
        <p className="text-xs text-zinc-500">{yearsHosting} year{yearsHosting !== 1 ? 's' : ''} hosting</p>
      </div>
    </section>
  );
}
