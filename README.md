# Dynamic Workflow Engine

## Overview
This is a full-stack Dynamic Workflow Engine designed to manage, evaluate, and execute complex logic workflows autonomously. It includes an interactive graph UI designer, a powerful server-side Node.js rule engine, structured execution logs, and full audit trailing.

## Tech Stack
- **Frontend**: Vanilla Javascript, HTML5, Vanilla CSS (No dependencies).
- **Backend**: Node.js, Express.js.
- **Data Persistence**: JSON Flat-Files (`workflows.json`, `rules.json`, `steps.json`, `executions.json`).

## Setup Instructions
1. Ensure you have Node.js installed.
2. Clone the repository and navigate to the project root directory.
3. Install dependencies:
   ```bash
   npm install cors express uuid
   ```
   *(Note: The environment is already pre-configured if using the provided build code)*
4. Start the backend server:
   ```bash
   node server.js
   ```
   *The server runs on `http://localhost:3000` by default.*
5. Open the Frontend:
   Double click the `index.html` file in the root directory to open it in your web browser. 
   *(Alternatively, run a static file server if preferred)*

## Workflow Engine Design Architecture
The engine handles step-by-step resolution of dynamically defined logic trees. It follows these core concepts:
- **Workflows**: Acts as the master container linking independent Steps alongside input schemas.
- **Steps**: Isolated execution nodes (Tasks, Approvals, Notifications). 
- **Rules**: Dynamically evaluated Javascript conditions tied to specific Steps.
- **Rule Engine**: When executed, the engine runs a sandboxed Javascript boolean evaluator (`new Function()`) across the supplied JSON `input_data` to determine path routing.
- **Loop Prevention**: Handled via `MAX_ITERATIONS` step counting inside the resolution loop.

## Sample Workflows & Testing
The system comes pre-initialized with a few simple workflows or you can design new ones via the **Workflow Designer** tab. You can Export those workflows directly into the backend via the UI or using the `POST /workflows` REST API.

**Execution Example:**

1. Head to **Workflow List**, find a Workflow, and press "Execute". 
2. Fill out the **Input Data**.
   ```json
   {
       "amount": 250,
       "country": "US",
       "department": "Finance",
       "priority": "High"
   }
   ```
3. The Execution Tracker will automatically jump to step 1, evaluate conditions (e.g., `amount > 100 && country == 'US' && priority == 'High'`), push the result (True/False) to the stack logs, and jump functionally to the `Next Step` (e.g., Finance Notification) while tracking state and loop iteration parameters continuously.

## Demo Video Requirements
To generate a Demo Video showcasing this application (3-5 minutes):
1. **Creation**: Start by navigating to the "Workflow Designer", dragging several components (Steps) onto the canvas, configuring their side-panel parameters, and Exporting the workflow.
2. **Rules**: Switch to the "Workflow Editor", select your newly created Workflow, hit "Rules" near a step, and showcase dragging and validating the priority hierarchy of boolean conditions.
3. **Execution**: Jump back to the "Workflow List", click the Execute icon, provide Input json parameters matching your condition, and launch it!
4. **Logs**: While executing, highlight how the Execution progress banner flashes its polling responses, and navigate finally into the "Audit Log" terminal view to read historically stored runs.
