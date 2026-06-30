import OsSidebar    from '@/components/os/OsSidebar'
import OsTopBar     from '@/components/os/OsTopBar'
import OsAuthGuard  from '@/components/os/OsAuthGuard'

export const metadata = { title: 'AI OS β | And Planning' }

export default function OsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#060C18] text-slate-200">
      <OsSidebar />
      <OsTopBar />
      {/* Content — offset for sidebar width + topbar height */}
      <main className="pl-16 lg:pl-56 pt-14">
        <div className="p-4 lg:p-6 min-h-[calc(100vh-56px)]">
          <OsAuthGuard>{children}</OsAuthGuard>
        </div>
      </main>
    </div>
  )
}
