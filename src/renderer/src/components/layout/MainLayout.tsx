import { useState } from 'react'
import { TopMenuBar } from './TopMenuBar'
import { Sidebar } from '../sidebar/Sidebar'
import { PreviewPanel } from '../preview/PreviewPanel'
import { PropertiesPanel } from '../properties/PropertiesPanel'
import { Timeline } from '../timeline/Timeline'
import { BibleBrowserModal } from '../bible/BibleBrowserModal'
import { SongBrowserModal } from '../songs/SongBrowserModal'

export function MainLayout() {
  const [bibleOpen, setBibleOpen] = useState(false)
  const [songsOpen, setSongsOpen] = useState(false)

  return (
    <div className="grid h-screen grid-rows-[48px_1fr_260px] bg-surface-950 text-neutral-200">
      <TopMenuBar />
      <div className="grid grid-cols-[260px_minmax(0,1fr)_300px] grid-rows-[minmax(0,1fr)] overflow-hidden border-t border-surface-800">
        <Sidebar onOpenBible={() => setBibleOpen(true)} onOpenSongs={() => setSongsOpen(true)} />
        <PreviewPanel />
        <PropertiesPanel />
      </div>
      <Timeline />
      <BibleBrowserModal open={bibleOpen} onClose={() => setBibleOpen(false)} />
      <SongBrowserModal open={songsOpen} onClose={() => setSongsOpen(false)} />
    </div>
  )
}
