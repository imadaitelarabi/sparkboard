# Focus Mode Feature Design Document

## 🎯 Overview
Focus Mode provides a unified task dashboard where users can aggregate tasks from multiple projects into a focused kanban view with To Do, In Progress, and Done columns. Tasks can be added via drag-and-drop, and status changes sync bidirectionally with their original projects.

## 📊 Data Architecture

### Core Data Structures

#### FocusTask
```typescript
interface FocusTask {
  id: string          // Task ID from database
  addedAt: number     // Timestamp when added to focus mode
  position?: number   // Optional position within focus mode
}
```

#### FocusMode
```typescript
interface FocusMode {
  tasks: FocusTask[]           // Array of focused task references
  settings: TimeframeSettings  // User-defined reset settings  
  lastResetAt: number          // Timestamp of last reset
  isActive: boolean           // Whether focus mode is currently active
  createdAt: number           // When focus mode was first created
}
```

#### TimeframeSettings
```typescript
interface TimeframeSettings {
  type: 'daily' | 'weekly' | 'monthly' | 'custom'
  customDays?: number      // For custom timeframe
  resetTime: number        // Hour of day to reset (0-23)
  autoReset: boolean      // Whether to auto-reset expired tasks
}
```

### State Management Integration

#### Zustand Store Extensions
Add to existing AppState:
```typescript
// Focus Mode state
focusMode: FocusMode | null
setFocusMode: (focusMode: FocusMode | null) => void
toggleFocusMode: () => void
addTasksToFocus: (taskIds: string[]) => void
removeTaskFromFocus: (taskId: string) => void
updateFocusSettings: (settings: Partial<TimeframeSettings>) => void

// UI state for focus mode
isFocusModeActive: boolean
setIsFocusModeActive: (active: boolean) => void
pendingFocusTasks: string[]  // Tasks being dragged to focus mode
setPendingFocusTasks: (tasks: string[]) => void
showFocusFloatingCard: boolean
setShowFocusFloatingCard: (show: boolean) => void
```

## 🎨 UI/UX Design

### Dashboard Integration

#### 1. Focus Mode Toggle
**Location**: Dashboard header, next to view mode toggle
**Design**: Toggle switch with "Focus Mode" label
**States**: 
- Off: Normal kanban/grid view
- On: Focus mode kanban view

#### 2. Empty Focus Mode State
**Trigger**: Focus mode active but no tasks added
**Design**: Center card with:
- "Focus Mode is Empty" title
- "Add tasks to get focused" subtitle  
- "Add Tasks" button
**Action**: Button triggers add task flow

#### 3. Add Tasks Flow
**Trigger**: "Add Tasks" button or drag-and-drop
**Design**: 
- Shows normal kanban grouped by project
- Floating focus card at bottom
- Tasks can be dragged to floating card
**Visual feedback**: 
- Task counter in floating card increases
- Floating card grows/highlights on hover
- "Confirm Adding Tasks" button appears when tasks pending

#### 4. Focus Mode Kanban
**Design**: Standard kanban with 3 columns:
- **To Do**: `status = 'pending'`
- **In Progress**: `status = 'in_progress'`  
- **Done**: `status = 'completed'`
**Features**:
- Drag & drop between columns
- Task cards show project context
- Remove from focus action per task
- Add new task directly to focus mode

### Component Architecture

#### FocusModeToggle
- Toggle switch component
- Integrates with dashboard header
- Manages focus mode activation state

#### FocusModeEmpty  
- Empty state component
- Call-to-action for adding tasks
- Triggers add task flow

#### FocusFloatingCard
- Floating bottom card for drag targets
- Shows pending task count
- Confirm/cancel actions for batch adding

#### FocusModeKanban
- Specialized kanban for focus mode
- Fixed 3-column layout (To Do, In Progress, Done)
- Task cards with project context and remove actions

#### FocusModeSettings
- Modal/panel for timeframe configuration
- Reset time selection
- Auto-reset toggle
- Custom timeframe input

## ⚡ User Flows

### Primary Flow: Adding Tasks to Focus Mode
1. User clicks "Toggle Focus Mode" → Focus mode activates
2. If empty: User sees empty state → clicks "Add Tasks"
3. System shows project-grouped kanban with floating card
4. User drags tasks to floating card → counter increases
5. User clicks "Confirm Adding Tasks" → focus mode kanban appears
6. User can now work with focused tasks in 3-column view

### Secondary Flows

#### Working with Focus Mode Tasks
1. User drags tasks between To Do/In Progress/Done
2. System syncs status change with original project
3. Task maintains project context in card display

#### Removing Tasks from Focus
1. User clicks remove icon on task card
2. Task disappears from focus mode
3. Original task status unchanged in project

#### Creating New Focus Tasks
1. User clicks "+" in focus mode column
2. Modal opens for task creation
3. User selects project and fills details
4. Task created in project AND added to focus mode

#### Timeframe Management
1. User accesses focus mode settings
2. Configures reset timeframe (daily/weekly/monthly/custom)
3. Sets reset time and auto-reset preference
4. System automatically resets focus mode based on settings

## 🔄 Data Synchronization

### Task Status Sync
- Focus mode changes update original task status
- Original project changes reflect in focus mode
- Bidirectional sync ensures consistency

### Focus Mode Persistence
- Tasks stored as references (IDs) in localStorage
- Full task data fetched from database on load
- Automatic cleanup of non-existent task references

### Auto-Reset Logic
- Checks timeframe settings on focus mode load
- Automatically clears expired tasks
- Preserves user settings across resets

## 🎯 Implementation Phases

### Phase 1: Core Foundation
1. ✅ Focus mode localStorage utility
2. 🔄 Zustand store integration
3. 🔄 Basic UI components (toggle, empty state)

### Phase 2: Drag & Drop Experience
1. Floating card component
2. Drag target integration
3. Add tasks flow with visual feedback

### Phase 3: Focus Mode Kanban
1. Specialized kanban component
2. Task status synchronization
3. Remove tasks functionality

### Phase 4: Advanced Features
1. Create tasks directly in focus mode
2. Timeframe settings and auto-reset
3. Focus mode statistics and insights

### Phase 5: Polish & Testing
1. Animations and micro-interactions
2. Error handling and edge cases
3. Performance optimization
4. End-to-end testing

## 🧪 Testing Strategy

### Unit Tests
- Focus mode utility functions
- State management actions
- Component behavior

### Integration Tests
- Drag and drop functionality
- Task synchronization
- localStorage persistence

### End-to-End Tests
- Complete user flows
- Cross-browser compatibility
- Performance benchmarks

## 📈 Success Metrics

### User Engagement
- Focus mode adoption rate
- Time spent in focus mode
- Task completion rate in focus mode

### Productivity Impact
- Average tasks per focus session
- Time to complete focused tasks
- User retention with focus mode

### Technical Performance
- Load time for focus mode
- Sync reliability
- localStorage efficiency