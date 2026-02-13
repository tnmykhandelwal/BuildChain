# ⛓️ <strong>BUILD</strong><em>CHAIN</em> - A Construction Transparency System

## Description:

 This Project is created to solve a real-life problem we all have faced in the construction system. The project is based on the concepts of Blockchain. Buildchain is a project to bring more transparency in construction projects. It implement modules for registering projects, logging material deliveries with photos, recording labor attendance, and tracking milestone completion. Hash-linked logs are used to prevent any tampering of data. The landing page offers as a public dashboard showing project progress, budget usage, and verification tools.

## Features:

- User Authentication: Using Firebase Auth for admin (Govt/Institution), contractor / subcontractor / labor manager using Firebase Authentication. Metamask Authentication is also enabled for fast login after connecting wallet.
- Project Registry: Admin can create new projects with title, contractor, budget, location, start/end dates, documents & blueprint uploads, etc. The Projects are exclusively assigned to the respective contractor to make any updates to it.
- Material Delivery Logs: Contractors log contains material name, supplier, quantity, delivery photos, time of delivery. Each log is hashed + chained to previous.
- Labor Attendance System: Labor manager can add/assign laborers, mark daily attendance, track daily wages, attendance is stored in append-only format.
- Payment Milestones: Admin sets milestones (Foundation → Flooring → Roofing → Completion). Contractor uploads proof → Admin approves. Each milestone approval becomes a hashed log entry.
- Public Transparency Dashboard: Shows budget usage, material logs, labor activity, milestone completion, hash verification tool.


## Tech Stack
| Layer | Tech |
|-------|------|
| Frontend | JS, HTML, CSS |
| Database | Firebase Firestore |
| Cryptographically Hashing | (SHA-256, AES) |
| Charts | Chart.js |