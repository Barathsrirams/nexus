const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Data files paths
const DATA_FILE = path.join(__dirname, 'workflows.json');
const STEPS_FILE = path.join(__dirname, 'steps.json');
const RULES_FILE = path.join(__dirname, 'rules.json');
const EXECUTIONS_FILE = path.join(__dirname, 'executions.json');

app.use(cors());
app.use(express.json());

// Initialize data files if they don't exist
const initFiles = () => {
  [DATA_FILE, STEPS_FILE, RULES_FILE, EXECUTIONS_FILE].forEach(file => {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify([]));
    }
  });
};
initFiles();

// Helpers to read/write JSON arrays
const readJson = (file) => JSON.parse(fs.readFileSync(file));
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));


// ==========================================
// WORKFLOWS
// ==========================================

// POST /workflows - Create workflow
app.post('/workflows', (req, res) => {
  const workflows = readJson(DATA_FILE);
  const newWorkflow = {
    id: req.body.id || uuidv4(),
    version: req.body.version || 1,
    ...req.body,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  workflows.push(newWorkflow);
  writeJson(DATA_FILE, workflows);
  
  res.status(201).json(newWorkflow);
});

// GET /workflows - List workflows (pagination & search)
app.get('/workflows', (req, res) => {
  const workflows = readJson(DATA_FILE);
  let result = [...workflows];
  
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    result = result.filter(w => searchRegex.test(w.name));
  }
  
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  
  const paginatedResult = result.slice(startIndex, endIndex);
  
  res.json({
    total: result.length,
    page,
    limit,
    totalPages: Math.ceil(result.length / limit),
    data: paginatedResult
  });
});

// GET /workflows/:id - Get workflow details including steps & rules
app.get('/workflows/:id', (req, res) => {
  const workflows = readJson(DATA_FILE);
  const workflow = workflows.find(w => w.id === req.params.id);
  
  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  const steps = readJson(STEPS_FILE).filter(s => s.workflow_id === req.params.id);
  const rules = readJson(RULES_FILE);

  // Attach rules to steps
  const stepsWithRules = steps.map(step => {
    return {
      ...step,
      rules: rules.filter(r => r.step_id === step.id)
    };
  });
  
  res.json({
    ...workflow,
    steps: stepsWithRules
  });
});

// PUT /workflows/:id - Update workflow (creates new version)
app.put('/workflows/:id', (req, res) => {
  const workflows = readJson(DATA_FILE);
  const index = workflows.findIndex(w => w.id === req.params.id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Workflow not found' });
  }
  
  const currentWorkflow = workflows[index];
  const updatedWorkflow = {
    ...currentWorkflow,
    ...req.body,
    id: currentWorkflow.id,
    version: (currentWorkflow.version || 1) + 1,
    updated_at: new Date().toISOString()
  };
  
  workflows[index] = updatedWorkflow;
  writeJson(DATA_FILE, workflows);
  
  res.json(updatedWorkflow);
});

// DELETE /workflows/:id - Delete workflow (cascade steps/rules)
app.delete('/workflows/:id', (req, res) => {
  const workflows = readJson(DATA_FILE);
  const filteredWorkflows = workflows.filter(w => w.id !== req.params.id);
  
  // Actually, we replaced it anyway. 
  // Wait, if no workflows.length change, it doesn't exist
  if (workflows.length === filteredWorkflows.length) {
    return res.status(404).json({ error: 'Workflow not found' });
  }
  
  writeJson(DATA_FILE, filteredWorkflows);

  // Cascade delete logic
  const steps = readJson(STEPS_FILE);
  const stepsToDelete = steps.filter(s => s.workflow_id === req.params.id).map(s => s.id);
  writeJson(STEPS_FILE, steps.filter(s => s.workflow_id !== req.params.id));

  const rules = readJson(RULES_FILE);
  writeJson(RULES_FILE, rules.filter(r => !stepsToDelete.includes(r.step_id)));

  res.status(204).send();
});


// ==========================================
// STEPS
// ==========================================

// POST /workflows/:workflow_id/steps - Add step
app.post('/workflows/:workflow_id/steps', (req, res) => {
  const workflows = readJson(DATA_FILE);
  if (!workflows.some(w => w.id === req.params.workflow_id)) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  const steps = readJson(STEPS_FILE);
  const newStep = {
    id: req.body.id || uuidv4(),
    workflow_id: req.params.workflow_id,
    ...req.body,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  steps.push(newStep);
  writeJson(STEPS_FILE, steps);

  res.status(201).json(newStep);
});

// GET /workflows/:workflow_id/steps - List steps for workflow
app.get('/workflows/:workflow_id/steps', (req, res) => {
  const steps = readJson(STEPS_FILE).filter(s => s.workflow_id === req.params.workflow_id);
  res.json(steps);
});

// PUT /steps/:id - Update step
app.put('/steps/:id', (req, res) => {
  const steps = readJson(STEPS_FILE);
  const index = steps.findIndex(s => s.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: 'Step not found' });

  const updatedStep = {
    ...steps[index],
    ...req.body,
    id: steps[index].id,
    workflow_id: steps[index].workflow_id, // Prevent re-assigning workflow
    updated_at: new Date().toISOString()
  };

  steps[index] = updatedStep;
  writeJson(STEPS_FILE, steps);

  res.json(updatedStep);
});

// DELETE /steps/:id - Delete step
app.delete('/steps/:id', (req, res) => {
  const steps = readJson(STEPS_FILE);
  const filteredSteps = steps.filter(s => s.id !== req.params.id);

  if (steps.length === filteredSteps.length) {
    return res.status(404).json({ error: 'Step not found' });
  }

  writeJson(STEPS_FILE, filteredSteps);

  const rules = readJson(RULES_FILE);
  writeJson(RULES_FILE, rules.filter(r => r.step_id !== req.params.id));

  res.status(204).send();
});


// ==========================================
// RULES
// ==========================================

// POST /steps/:step_id/rules - Add rule
app.post('/steps/:step_id/rules', (req, res) => {
  const steps = readJson(STEPS_FILE);
  if (!steps.some(s => s.id === req.params.step_id)) {
    return res.status(404).json({ error: 'Step not found' });
  }

  const rules = readJson(RULES_FILE);
  const newRule = {
    id: req.body.id || uuidv4(),
    step_id: req.params.step_id,
    ...req.body,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  rules.push(newRule);
  writeJson(RULES_FILE, rules);

  res.status(201).json(newRule);
});

// GET /steps/:step_id/rules - List rules for step
app.get('/steps/:step_id/rules', (req, res) => {
  const rules = readJson(RULES_FILE).filter(r => r.step_id === req.params.step_id);
  res.json(rules);
});

// PUT /rules/:id - Update rule
app.put('/rules/:id', (req, res) => {
  const rules = readJson(RULES_FILE);
  const index = rules.findIndex(r => r.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: 'Rule not found' });

  const updatedRule = {
    ...rules[index],
    ...req.body,
    id: rules[index].id,
    step_id: rules[index].step_id, // Prevent re-assigning step
    updated_at: new Date().toISOString()
  };

  rules[index] = updatedRule;
  writeJson(RULES_FILE, rules);

  res.json(updatedRule);
});

// DELETE /rules/:id - Delete rule
app.delete('/rules/:id', (req, res) => {
  const rules = readJson(RULES_FILE);
  const filteredRules = rules.filter(r => r.id !== req.params.id);

  if (rules.length === filteredRules.length) {
    return res.status(404).json({ error: 'Rule not found' });
  }

  writeJson(RULES_FILE, filteredRules);

  res.status(204).send();
});

// ==========================================
// EXECUTIONS
// ==========================================

// POST /workflows/:workflow_id/execute - Start workflow execution

const executeWorkflowLogic = async (executionId, workflowId, inputData) => {
  // Configurable Max Iterations to prevent infinite loops (Bonus feature)
  const MAX_ITERATIONS = process.env.MAX_ITERATIONS ? parseInt(process.env.MAX_ITERATIONS) : 50;
  
  const updateExecution = (updater) => {
    const executions = readJson(EXECUTIONS_FILE);
    const exeIndex = executions.findIndex(e => e.id === executionId);
    if (exeIndex > -1) {
      updater(executions[exeIndex]);
      executions[exeIndex].updated_at = new Date().toISOString();
      writeJson(EXECUTIONS_FILE, executions);
    }
  };

  const addLog = (message, isError = false) => {
    updateExecution(e => {
      e.logs.push({
        timestamp: new Date().toISOString(),
        level: isError ? 'ERROR' : 'INFO',
        message
      });
    });
  };

  const updateStepExecutions = (stepLog) => {
    updateExecution(e => {
      if (!e.step_executions) e.step_executions = [];
      const index = e.step_executions.findIndex(s => s.step_id === stepLog.step_id && s.iteration === stepLog.iteration);
      if (index > -1) {
        e.step_executions[index] = stepLog;
      } else {
        e.step_executions.push(stepLog);
      }
    });
  };

  updateExecution(e => { e.status = 'in_progress'; e.step_executions = []; });
  addLog(`Started execution for workflow: ${workflowId}`);

  try {
    const workflows = readJson(DATA_FILE);
    const workflow = workflows.find(w => w.id === workflowId);
    
    if (!workflow) {
      addLog('Workflow not found. Terminating.', true);
      updateExecution(e => { e.status = 'failed'; });
      return;
    }

    const allSteps = readJson(STEPS_FILE).filter(s => s.workflow_id === workflowId);
    const allRules = readJson(RULES_FILE);

    // Get starting step
    let currentStepId = workflow.start_step_id;
    if (!currentStepId && allSteps.length > 0) {
      currentStepId = allSteps.sort((a, b) => (a.order || 0) - (b.order || 0))[0].id; // Fallback to first step by order
    }

    if (!currentStepId) {
      addLog('No start step found for workflow. Terminating.', true);
      updateExecution(e => { e.status = 'failed'; });
      return;
    }

    const stepExecCounts = {};

    while (currentStepId) {
      // Bonus: Loop prevention -> Configurable max iterations to guard infinite loops
      stepExecCounts[currentStepId] = (stepExecCounts[currentStepId] || 0) + 1;
      if (stepExecCounts[currentStepId] > MAX_ITERATIONS) {
        addLog(`Step ${currentStepId} exceeded max iterations (${MAX_ITERATIONS}). Infinite loop detected. Terminating.`, true);
        updateExecution(e => { e.status = 'failed'; });
        break;
      }

      const step = allSteps.find(s => s.id === currentStepId);
      if (!step) {
        addLog(`Step ${currentStepId} not found in workflow. Terminating.`, true);
        updateExecution(e => { e.status = 'failed'; });
        break;
      }

      const stepStartTime = Date.now();
      let stepLog = {
        step_id: step.id,
        iteration: stepExecCounts[currentStepId],
        step_name: step.name,
        step_type: step.step_type || 'task',
        rules_evaluated: [],
        next_step: null,
        next_step_name: null,
        status: 'In Progress',
        approver: step.step_type === 'approval' ? 'admin@nexus.local' : '-',
        duration: '0s'
      };
      updateStepExecutions(stepLog);

      addLog(`[Step: ${step.name || step.id}] Evaluating rules...`);

      const stepRules = allRules
        .filter(r => r.step_id === currentStepId)
        .sort((a, b) => (a.priority || 0) - (b.priority || 0));

      let nextStepId = null;
      let matchedRule = null;
      let defaultRule = stepRules.find(r => r.condition === 'DEFAULT');
      let stepFailedDueToInvalidRule = false;

      // Rule Evaluation Runtime Engine
      for (const rule of stepRules) {
        if (rule.condition === 'DEFAULT') continue;

        addLog(`Evaluating condition: "${rule.condition}"`);
        let result = false;
        
        try {
          const evaluator = new Function('data', `
            with (data) {
              return !!(${rule.condition});
            }
          `);
          result = evaluator(inputData || {});
        } catch (err) {
          addLog(`Rule evaluation failed for condition "${rule.condition}": ${err.message}`, true);
          stepFailedDueToInvalidRule = true;
          stepLog.rules_evaluated.push({ rule: rule.condition, result: "ERROR" });
          break; 
        }

        stepLog.rules_evaluated.push({ rule: rule.condition, result });

        if (result) {
          matchedRule = rule;
          addLog(`Rule matched! Proceeding to next step: ${rule.next_step_id}`);
          break;
        } else {
          addLog(`Condition false.`);
        }
      }

      if (stepFailedDueToInvalidRule) {
        if (defaultRule) {
          addLog(`Step marked failed due to invalid rule. Continuing to DEFAULT next step: ${defaultRule.next_step_id}`);
          nextStepId = defaultRule.next_step_id;
        } else {
          addLog(`Step marked failed due to invalid rule. No DEFAULT rule found. Terminating.`, true);
          stepLog.status = 'Failed';
          stepLog.duration = Math.floor((Date.now() - stepStartTime) / 1000) + 's';
          updateStepExecutions(stepLog);
          updateExecution(e => { e.status = 'failed'; });
          break;
        }
      } else if (matchedRule) {
        nextStepId = matchedRule.next_step_id;
      } else if (defaultRule) {
        stepLog.rules_evaluated.push({ rule: 'DEFAULT', result: true });
        addLog(`No priority rules matched. Using DEFAULT next step: ${defaultRule.next_step_id}`);
        nextStepId = defaultRule.next_step_id;
      } else {
        addLog(`No rules matched and no DEFAULT found. Terminating.`, true);
        stepLog.status = 'Failed';
        stepLog.duration = Math.floor((Date.now() - stepStartTime) / 1000) + 's';
        updateStepExecutions(stepLog);
        updateExecution(e => { e.status = 'failed'; });
        break;
      }

      currentStepId = nextStepId;
      stepLog.next_step = nextStepId;
      if (nextStepId && nextStepId !== 'END') {
         const ns = allSteps.find(s => s.id === nextStepId);
         stepLog.next_step_name = ns ? ns.name : nextStepId;
      }
      
      // Allow tick events so asynchronous HTTP doesn't hang
      await new Promise(r => setTimeout(r, 800)); // Make execution visually trackable

      stepLog.status = 'Completed';
      stepLog.duration = Math.max(1, Math.floor((Date.now() - stepStartTime) / 1000)) + 's';
      updateStepExecutions(stepLog);

      if (!currentStepId || currentStepId === 'END') {
        addLog(`Workflow reached explicit end.`);
        updateExecution(e => { e.status = 'completed'; });
        break;
      }
    }
  } catch (error) {
    addLog(`System Execution Error: ${error.message}`, true);
    updateExecution(e => { e.status = 'failed'; });
  }
};

app.post('/workflows/:workflow_id/execute', (req, res) => {
  const workflows = readJson(DATA_FILE);
  if (!workflows.some(w => w.id === req.params.workflow_id)) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  const executions = readJson(EXECUTIONS_FILE);
  const newExecution = {
    id: req.body.id || uuidv4(),
    workflow_id: req.params.workflow_id,
    status: 'pending',
    logs: [],
    ...req.body,
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  executions.push(newExecution);
  writeJson(EXECUTIONS_FILE, executions);

  // Background Async Execution
  executeWorkflowLogic(newExecution.id, req.params.workflow_id, req.body.data || req.body);

  res.status(201).json(newExecution);
});

// GET /executions - Get all executions
app.get('/executions', (req, res) => {
  const executions = readJson(EXECUTIONS_FILE);
  // Optional: We can enrich this with workflow names
  const workflows = readJson(DATA_FILE);
  
  const enrichedExecutions = executions.map(e => {
    const wf = workflows.find(w => w.id === e.workflow_id);
    return {
      ...e,
      workflow_name: wf ? wf.name : 'Unknown Workflow',
      workflow_version: wf ? (wf.version || 1) : 1
    };
  });
  
  res.json(enrichedExecutions.sort((a,b) => new Date(b.started_at) - new Date(a.started_at)));
});

// GET /executions/:id - Get execution status & logs
app.get('/executions/:id', (req, res) => {
  const executions = readJson(EXECUTIONS_FILE);
  const execution = executions.find(e => e.id === req.params.id);

  if (!execution) return res.status(404).json({ error: 'Execution not found' });

  res.json(execution);
});

// POST /executions/:id/cancel - Cancel execution
app.post('/executions/:id/cancel', (req, res) => {
  const executions = readJson(EXECUTIONS_FILE);
  const index = executions.findIndex(e => e.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: 'Execution not found' });

  executions[index].status = 'cancelled';
  executions[index].updated_at = new Date().toISOString();
  
  writeJson(EXECUTIONS_FILE, executions);

  res.json(executions[index]);
});

// POST /executions/:id/retry - Retry failed step
app.post('/executions/:id/retry', (req, res) => {
  const executions = readJson(EXECUTIONS_FILE);
  const index = executions.findIndex(e => e.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: 'Execution not found' });

  executions[index].status = 'retrying';
  executions[index].updated_at = new Date().toISOString();
  
  writeJson(EXECUTIONS_FILE, executions);

  res.json(executions[index]);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
