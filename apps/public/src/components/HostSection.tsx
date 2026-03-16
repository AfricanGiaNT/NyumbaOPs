type HostSectionProps = {
  hostName?: string;
  yearsHosting?: number;
};

export function HostSection({ hostName = "Trevor", yearsHosting = 1 }: HostSectionProps) {
  return (
    <div className="flex items-center gap-4 border-b border-zinc-200 py-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-xl font-bold text-white">
        {hostName.charAt(0).toUpperCase()}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Hosted by {hostName}</h2>
        <p className="text-sm text-zinc-600">{yearsHosting} year{yearsHosting !== 1 ? 's' : ''} hosting</p>
      </div>
    </div>
  );
}
