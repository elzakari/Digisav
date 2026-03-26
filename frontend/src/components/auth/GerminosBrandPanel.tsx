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
          <div className="h-16 w-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl font-black">
            G
          </div>
        )}

        <div className="leading-tight">
          <div className="text-2xl font-black tracking-tight text-zinc-950">Germinos</div>
          <div className="text-sm text-zinc-700">Secure, simple savings groups.</div>
        </div>
      </div>

      <div className="mt-8 hidden md:block">
        <div className="text-xs font-semibold text-zinc-800">Why Germinos?</div>
        <ul className="mt-2 space-y-2 text-sm text-zinc-700 leading-relaxed list-disc pl-5 marker:text-indigo-400">
          <li>Track contributions and payouts with clarity.</li>
          <li>Stay on schedule with reminders and reports.</li>
          <li>Keep your data safe and private.</li>
        </ul>
      </div>
    </div>
  )
}
