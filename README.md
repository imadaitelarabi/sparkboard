📝 Product Requirements Document (PRD)

Product Name: SparkBoard
Owner: Imad
Date: July 19, 2025
1️⃣ Objective

Build a collaborative whiteboard tool designed for project management with a minimal, intuitive interface.
Users can visually brainstorm, collaborate in real-time, and easily convert visual elements into tasks linked to their projects.
2️⃣ Core Features
✅ 1. Project & Board Management

    A user can create multiple Projects.

    Each Project contains:

        Multiple Whiteboards (nameable, sharable).

        One Tasks Board (Kanban style).

    Boards are switchable via a sidebar or tab menu.

✅ 2. Whiteboard Core Features

    Infinite canvas with pan/zoom.

    Basic elements:

        Sticky Notes

        Shapes (Rectangle, Circle, Arrow)

        Text

        Connectors

        Freehand draw

    Select single/multiple elements via drag-select or shift+click.

    Group/Ungroup elements.

    Collaborative real-time editing (multi-user cursor).

    Elements can be:

        Edited

        Moved

        Deleted

        Selected & turned into a Task.

✅ 3. Create Tasks from Elements

    After selecting one or multiple elements:

        “Create Task” action triggers a modal with:

            Task Title (pre-filled from selected text if any)

            Description (optional)

            Category (from Kanban Board)

            Assignee

            Due Date

        Once created:

            Task appears on the Tasks Board.

            Related elements on whiteboard get a small Task Badge/Icon.

            Clicking on the task in the Tasks Board highlights/zooms to elements in the whiteboard.

✅ 4. Tasks Board (Per Project)

    Tasks Board is a Whiteboard with flexible Kanban categories.

    Categories can be:

        Created

        Renamed

        Deleted

        Reordered

    Tasks are movable between categories.

    Each Task Card:

        Title

        Assignee

        Due Date

        Linked Whiteboard Elements (Click to zoom)

    Optional task details on click (popup or side panel).

✅ 5. Dashboard

    Global view of:

        All Projects

        Task Previews (Kanban/List)

        Filter by:

            Project

            Status

            Assignee

            Due Date

    Clicking a Task on Dashboard:

        Opens related Project and highlights the related elements on its Whiteboard.

3️⃣ Collaboration Features

    Live cursors & element locking.

    Real-time task updates.

    User avatars with online status.

    Comments on tasks (optional, v2).

4️⃣ MVP Scope Summary
Feature	Status
Project & Board Management	✅
Whiteboard Basic Elements	✅
Selection & Task Creation	✅
Task Kanban Board	✅
Dashboard with Filters	✅
Real-time Collaboration	✅
5️⃣ User Flows

[Flow 1] Create Project & Whiteboards
User → Create Project → Add Whiteboard(s) → Start drawing/brainstorming.

[Flow 2] Select Elements → Create Task
User selects elements → Clicks "Create Task" → Task is created & linked.

[Flow 3] View Tasks on Task Board
User opens Task Board → See tasks grouped by category → Moves/updates them.

[Flow 4] Use Dashboard
User opens Dashboard → Filters tasks → Clicks a task → Navigated to Project Whiteboard.


7️⃣ Tech Stack Suggestion

    Frontend: NextJS + Konva.js / Fabric.js (Whiteboard), Zustand, Tailwind

    Backend: Supabase (Auth, DB, Realtime)

    Collab Layer: Liveblocks or Yjs

    Deployment: Vercel
