'use client'

import Modal from './Modal'
import { Lightbulb } from 'lucide-react'

interface NoLinkedElementsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function NoLinkedElementsModal({
  isOpen,
  onClose
}: NoLinkedElementsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="No Linked Elements"
      size="sm"
    >
      <div className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-[var(--color-warning-100)] rounded-full flex items-center justify-center">
            <Lightbulb className="h-4 w-4 text-[var(--color-warning-600)]" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">
              This task doesn&apos;t have any elements linked to it yet. We&apos;re working on implementing the ability to attach elements to existing tasks soon!
            </p>
          </div>
        </div>
        
        <div className="flex justify-end pt-4 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-[var(--radius-md)] hover:bg-[var(--color-primary-600)] transition-colors duration-[var(--duration-fast)] font-medium"
          >
            Got it
          </button>
        </div>
      </div>
    </Modal>
  )
}