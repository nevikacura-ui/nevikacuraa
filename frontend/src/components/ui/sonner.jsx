import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    <>
      <style>{`
        /* Apple Liquid Glass Toast - Base Styles */
        [data-sonner-toast] {
          background: rgba(255, 255, 255, 0.45) !important;
          backdrop-filter: blur(24px) saturate(180%) !important;
          -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
          border: 1px solid rgba(255, 255, 255, 0.6) !important;
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.12),
            0 2px 8px rgba(0, 0, 0, 0.06),
            inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
          border-radius: 1.5rem !important;
          padding: 16px 20px !important;
        }
        
        /* Liquid water reflection overlay - top highlight */
        [data-sonner-toast]::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(255,255,255,0.6), transparent 50%);
          border-radius: 1.5rem;
          pointer-events: none;
        }
        
        /* Liquid water volume - subtle tint at bottom */
        [data-sonner-toast]::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, rgba(240,248,255,0.3), transparent 40%);
          border-radius: 1.5rem;
          pointer-events: none;
        }
        
        /* Success Toast - Green tint */
        [data-sonner-toast][data-type="success"] {
          background: rgba(240, 253, 244, 0.5) !important;
        }
        [data-sonner-toast][data-type="success"]::after {
          background: linear-gradient(to top, rgba(220, 252, 231, 0.4), transparent 40%);
        }
        [data-sonner-toast][data-type="success"] [data-title] {
          color: #166534 !important;
          font-weight: 600 !important;
          font-size: 15px !important;
        }
        [data-sonner-toast][data-type="success"] [data-description] {
          color: #15803d !important;
        }
        [data-sonner-toast][data-type="success"] [data-icon] svg {
          color: #16a34a !important;
        }
        [data-sonner-toast][data-type="success"] [data-close-button] {
          background: rgba(22, 163, 74, 0.1) !important;
          border: 1px solid rgba(22, 163, 74, 0.2) !important;
          color: #166534 !important;
        }
        [data-sonner-toast][data-type="success"] [data-close-button]:hover {
          background: rgba(22, 163, 74, 0.2) !important;
        }
        
        /* Error Toast - Red tint */
        [data-sonner-toast][data-type="error"] {
          background: rgba(254, 242, 242, 0.5) !important;
        }
        [data-sonner-toast][data-type="error"]::after {
          background: linear-gradient(to top, rgba(254, 226, 226, 0.4), transparent 40%);
        }
        [data-sonner-toast][data-type="error"] [data-title] {
          color: #991b1b !important;
          font-weight: 600 !important;
          font-size: 15px !important;
        }
        [data-sonner-toast][data-type="error"] [data-description] {
          color: #b91c1c !important;
        }
        [data-sonner-toast][data-type="error"] [data-icon] svg {
          color: #dc2626 !important;
        }
        [data-sonner-toast][data-type="error"] [data-close-button] {
          background: rgba(220, 38, 38, 0.1) !important;
          border: 1px solid rgba(220, 38, 38, 0.2) !important;
          color: #991b1b !important;
        }
        [data-sonner-toast][data-type="error"] [data-close-button]:hover {
          background: rgba(220, 38, 38, 0.2) !important;
        }
        
        /* Info Toast - Blue tint */
        [data-sonner-toast][data-type="info"] {
          background: rgba(239, 246, 255, 0.5) !important;
        }
        [data-sonner-toast][data-type="info"]::after {
          background: linear-gradient(to top, rgba(219, 234, 254, 0.4), transparent 40%);
        }
        [data-sonner-toast][data-type="info"] [data-title] {
          color: #1e40af !important;
          font-weight: 600 !important;
          font-size: 15px !important;
        }
        [data-sonner-toast][data-type="info"] [data-description] {
          color: #1d4ed8 !important;
        }
        [data-sonner-toast][data-type="info"] [data-icon] svg {
          color: #2563eb !important;
        }
        [data-sonner-toast][data-type="info"] [data-close-button] {
          background: rgba(37, 99, 235, 0.1) !important;
          border: 1px solid rgba(37, 99, 235, 0.2) !important;
          color: #1e40af !important;
        }
        [data-sonner-toast][data-type="info"] [data-close-button]:hover {
          background: rgba(37, 99, 235, 0.2) !important;
        }
        
        /* Warning Toast - Amber tint */
        [data-sonner-toast][data-type="warning"] {
          background: rgba(255, 251, 235, 0.5) !important;
        }
        [data-sonner-toast][data-type="warning"]::after {
          background: linear-gradient(to top, rgba(254, 243, 199, 0.4), transparent 40%);
        }
        [data-sonner-toast][data-type="warning"] [data-title] {
          color: #92400e !important;
          font-weight: 600 !important;
          font-size: 15px !important;
        }
        [data-sonner-toast][data-type="warning"] [data-description] {
          color: #b45309 !important;
        }
        [data-sonner-toast][data-type="warning"] [data-icon] svg {
          color: #d97706 !important;
        }
        [data-sonner-toast][data-type="warning"] [data-close-button] {
          background: rgba(217, 119, 6, 0.1) !important;
          border: 1px solid rgba(217, 119, 6, 0.2) !important;
          color: #92400e !important;
        }
        [data-sonner-toast][data-type="warning"] [data-close-button]:hover {
          background: rgba(217, 119, 6, 0.2) !important;
        }
        
        /* Default Toast - Neutral glass */
        [data-sonner-toast]:not([data-type]) [data-title],
        [data-sonner-toast][data-type="default"] [data-title] {
          color: #1e293b !important;
          font-weight: 600 !important;
          font-size: 15px !important;
        }
        [data-sonner-toast]:not([data-type]) [data-description],
        [data-sonner-toast][data-type="default"] [data-description] {
          color: #475569 !important;
        }
        [data-sonner-toast]:not([data-type]) [data-icon] svg,
        [data-sonner-toast][data-type="default"] [data-icon] svg {
          color: #64748b !important;
        }
        [data-sonner-toast]:not([data-type]) [data-close-button],
        [data-sonner-toast][data-type="default"] [data-close-button] {
          background: rgba(100, 116, 139, 0.1) !important;
          border: 1px solid rgba(100, 116, 139, 0.2) !important;
          color: #475569 !important;
        }
      `}</style>
      <Sonner
        theme={theme}
        className="toaster group"
        toastOptions={{
          classNames: {
            toast:
              "group toast group-[.toaster]:shadow-xl group-[.toaster]:rounded-3xl",
            description: "group-[.toast]:text-slate-600",
            actionButton:
              "group-[.toast]:bg-white/80 group-[.toast]:backdrop-blur-sm group-[.toast]:text-teal-700 group-[.toast]:font-semibold group-[.toast]:rounded-full group-[.toast]:border group-[.toast]:border-white/50",
            cancelButton:
              "group-[.toast]:bg-slate-100/80 group-[.toast]:backdrop-blur-sm group-[.toast]:text-slate-600 group-[.toast]:rounded-full",
          },
        }}
        {...props} />
    </>
  );
}

export { Toaster, toast }
