import React from 'react'

export function GerminosBrandPanel() {
  const [showImage, setShowImage] = React.useState(true)

  return (
    <div className="w-full">
      <div className="flex items-center gap-4">
        {showImage ? (
          <img
            src="/brand/logo.png"
            alt="Germinos logo"
            className="h-16 w-auto drop-shadow-sm"
            onError={() => setShowImage(false)}
          />
        ) : (
          <div className="h-16 w-16 rounded-2xl bg-white/10 text-white flex items-center justify-center text-2xl font-black border border-white/10">
            G
          </div>
        )}

        <div className="leading-tight">
          <div className="text-2xl font-black tracking-tight text-white">Germinos</div>
          <div className="text-sm text-white/70">Secure, simple savings groups.</div>
        </div>
      </div>

      <div className="mt-8 hidden md:block">
        <div className="text-xs font-semibold text-white/85">Why Germinos?</div>
        <ul className="mt-2 space-y-2 text-sm text-white/70 leading-relaxed list-disc pl-5 marker:text-indigo-300">
          <li>Track contributions and payouts with clarity.</li>
          <li>Stay on schedule with reminders and reports.</li>
          <li>Keep your data safe and private.</li>
        </ul>
      </div>
    </div>
  )
}
