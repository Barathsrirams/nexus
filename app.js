// Application State
let nodes = [];
let selectedNodeId = null;
const state = { draggedType: null };

// DOM Elements
const canvas = document.getElementById('workflow-canvas');
const emptyState = document.querySelector('.empty-state');
const propertiesContent = document.getElementById('properties-content');
const btnClear = document.getElementById('btn-clear');
const tabs = document.querySelectorAll('.tab');
const designerView = document.getElementById('designer-view');
const schemaView = document.getElementById('schema-view');
const trackerView = document.getElementById('tracker-view');
const listView = document.getElementById('list-view');
const editorView = document.getElementById('editor-view');
const editorContent = document.getElementById('editor-content');
const ruleEditorView = document.getElementById('rule-editor-view');
const ruleEditorStepName = document.getElementById('rule-editor-step-name');
const rulesTableBody = document.getElementById('rules-table-body');
const executionIdleState = document.getElementById('execution-idle-state');
const executionInputForm = document.getElementById('execution-input-form');
const executionActiveState = document.getElementById('execution-active-state');
const overallStatusBadge = document.getElementById('overall-status-badge');
const executionProgressBanner = document.getElementById('execution-progress-banner');
const executionStructuredLogs = document.getElementById('execution-structured-logs');
const auditView = document.getElementById('audit-view');
const auditTableBody = document.getElementById('audit-table-body');

const executionModal = document.getElementById('execution-modal');
const btnExecute = document.getElementById('btn-execute');
const closeModalBtn = document.getElementById('close-modal');
const startSimulationBtn = document.getElementById('start-simulation');
const inputDataEl = document.getElementById('input-data');

// List View Elements
const workflowTableBody = document.getElementById('workflow-table-body');
const searchInput = document.getElementById('workflow-search');
const btnCreateWorkflow = document.getElementById('btn-create-workflow');
const btnPrevPage = document.getElementById('btn-prev-page');
const btnNextPage = document.getElementById('btn-next-page');
const pageIndicator = document.getElementById('page-indicator');
const totalCount = document.getElementById('workflow-total-count');

let currentListState = { page: 1, limit: 10, search: '', totalPages: 1 };


// Export Modal Elements
const exportModal = document.getElementById('export-modal');
const btnExport = document.getElementById('btn-export');
const closeExportBtn = document.getElementById('close-export');
const exportDataEl = document.getElementById('export-data');

// Icons mapping for node types
const icons = {
  trigger: 'bx-play-circle',
  action: 'bx-cog',
  decision: 'bx-git-branch',
  notification: 'bx-bell',
  approval: 'bx-check-shield'
};

// Drag from Toolbar
document.querySelectorAll('.tool-item').forEach(item => {
  item.addEventListener('dragstart', (e) => {
    state.draggedType = e.target.closest('.tool-item').dataset.type;
  });
});

// Drop on Canvas
canvas.addEventListener('dragover', (e) => {
  e.preventDefault();
});

canvas.addEventListener('drop', (e) => {
  e.preventDefault();
  if (!state.draggedType) return;
  addNode(state.draggedType);
  state.draggedType = null;
});

// Helper: generate ID
const generateId = () => crypto.randomUUID ? crypto.randomUUID() : 'id_' + Math.random().toString(36).substr(2, 9);

function addNode(type) {
  const newNode = {
    id: generateId(),
    type,
    name: capitalize(type) + ' Node',
    config: getDefaultConfig(type)
  };

  nodes.push(newNode);
  renderCanvas();
  selectNode(newNode.id);
}

function getDefaultConfig(type) {
  switch (type) {
    case 'trigger': return { event: 'On Data Received' };
    case 'action': return { script: 'Data processing...' };
    case 'decision': return {
      rules: `1 | amount > 100 && country == 'US' && priority == 'High' | Finance Notification
2 | amount <= 100 | None
3 | priority == 'Low' && country != 'US' | Task Rejection
4 | DEFAULT | Task Rejection`
    };
    case 'notification': return { message: 'Workflow completed successfully.', email: 'admin@nexus.com' };
    case 'approval': return { assignee_email: 'manager@example.com' };
    default: return {};
  }
}

function removeNode(id) {
  nodes = nodes.filter(n => n.id !== id);
  if (selectedNodeId === id) selectNode(null);
  renderCanvas();
}

function renderCanvas() {
  // Clear previous nodes excluding empty state
  const existingNodes = canvas.querySelectorAll('.workflow-node');
  existingNodes.forEach(n => n.remove());

  if (nodes.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  nodes.forEach(node => {
    const el = document.createElement('div');
    el.className = `workflow-node ${node.id === selectedNodeId ? 'selected' : ''}`;
    el.dataset.id = node.id;

    // HTML structure
    el.innerHTML = `
      <div class="node-header">
        <i class='bx ${icons[node.type]}'></i>
        <div class="title">${node.name}</div>
        <button class="delete-node"><i class='bx bx-x'></i></button>
      </div>
      <div class="node-body">
        ${getPreviewText(node)}
      </div>
    `;

    el.querySelector('.delete-node').addEventListener('click', (e) => {
      e.stopPropagation();
      removeNode(node.id);
    });

    el.addEventListener('click', () => {
      selectNode(node.id);
    });

    canvas.appendChild(el);
  });
}

function getPreviewText(node) {
  const c = node.config;
  switch (node.type) {
    case 'trigger': return `Event: ${c.event}`;
    case 'action': return `Action: ${c.script}`;
    case 'decision': return `<div class="rule-preview">Has ${c.rules ? c.rules.split('\\n').length : 0} defined rules</div>`;
    case 'notification': return `To: ${c.email}`;
    case 'approval': return `Assigned to: ${c.assignee_email}`;
    default: return 'No config';
  }
}

function selectNode(id) {
  selectedNodeId = id;
  renderCanvas();
  renderProperties();
}

function renderProperties() {
  if (!selectedNodeId) {
    propertiesContent.innerHTML = `
      <div class="empty-properties">
        <i class='bx bx-mouse-alt'></i>
        <p>Select a node to configure</p>
      </div>`;
    return;
  }

  const node = nodes.find(n => n.id === selectedNodeId);
  if (!node) return;

  let formHtml = `
    <div class="form-group">
      <label>Node Name</label>
      <input type="text" class="form-control" id="prop-name" value="${node.name}">
    </div>
  `;

  // Dynamic Type Configuration
  const c = node.config;
  switch (node.type) {
    case 'trigger':
      formHtml += `
        <div class="form-group">
          <label>Trigger Event</label>
          <select class="form-control" id="prop-event">
            <option value="On Data Received" ${c.event === 'On Data Received' ? 'selected' : ''}>On Data Received</option>
            <option value="Manual Trigger" ${c.event === 'Manual Trigger' ? 'selected' : ''}>Manual Trigger</option>
            <option value="Schedule" ${c.event === 'Schedule' ? 'selected' : ''}>Schedule</option>
          </select>
        </div>`;
      break;
    case 'action':
      formHtml += `
        <div class="form-group">
          <label>Process Description</label>
          <textarea class="form-control" id="prop-script" rows="3">${c.script || ''}</textarea>
        </div>`;
      break;
    case 'decision':
      formHtml += `
        <div class="form-group">
          <label>Routing Rules (Priority | Condition | Next Step)</label>
          <textarea class="form-control" id="prop-rules" rows="6" style="font-family: monospace; white-space: pre;">${c.rules || ''}</textarea>
          <small style="color:var(--text-dim); display:block; margin-top:0.5rem;">Use 'DEFAULT' as a condition for the fallback route.</small>
        </div>`;
      break;
    case 'notification':
      formHtml += `
        <div class="form-group">
          <label>Recipient Email</label>
          <input type="email" class="form-control" id="prop-email" value="${c.email || ''}">
        </div>
        <div class="form-group">
          <label>Message Payload</label>
          <textarea class="form-control" id="prop-message" rows="3">${c.message || ''}</textarea>
        </div>`;
      break;
    case 'approval':
      formHtml += `
        <div class="form-group">
          <label>Assignee Email</label>
          <input type="email" class="form-control" id="prop-assignee-email" value="${c.assignee_email || ''}">
        </div>`;
      break;
  }

  propertiesContent.innerHTML = formHtml;

  // Bind Listeners
  const bindChange = (id, prop, isConfig = true) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', (e) => {
      if (isConfig) {
        node.config[prop] = e.target.value;
      } else {
        node[prop] = e.target.value;
      }
      renderCanvas(); // Update preview
    });
  };

  bindChange('prop-name', 'name', false);
  bindChange('prop-event', 'event');
  bindChange('prop-script', 'script');
  bindChange('prop-rules', 'rules');
  bindChange('prop-email', 'email');
  bindChange('prop-message', 'message');
  bindChange('prop-assignee-email', 'assignee_email');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Clear all
btnClear.addEventListener('click', () => {
  if (confirm("Clear entire workflow?")) {
    nodes = [];
    selectNode(null);
  }
});

// Tab Switching
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const target = tab.dataset.target;

    // Hide all views first
    designerView.classList.add('hidden');
    if (schemaView) schemaView.classList.add('hidden');
    trackerView.classList.add('hidden');
    if (listView) listView.classList.add('hidden');
    if (editorView) editorView.classList.add('hidden');
    if (ruleEditorView) ruleEditorView.classList.add('hidden');
    if (auditView) auditView.classList.add('hidden');

    if (target === 'designer') {
      designerView.classList.remove('hidden');
    } else if (target === 'schema' && schemaView) {
      schemaView.classList.remove('hidden');
    } else if (target === 'tracker') {
      trackerView.classList.remove('hidden');
    } else if (target === 'list' && listView) {
      listView.classList.remove('hidden');
      loadWorkflows();
    } else if (target === 'editor' && editorView) {
      editorView.classList.remove('hidden');
    } else if (target === 'audit' && auditView) {
      auditView.classList.remove('hidden');
      loadAuditLog();
    }
  });
});

// UI Audit Log Engine
async function loadAuditLog() {
    if (!auditTableBody) return;
    auditTableBody.innerHTML = `<tr><td colspan="8" style="padding: 2rem; text-align: center; color: var(--text-dim);">Loading audit logs...</td></tr>`;
    try {
        const res = await fetch(`http://localhost:3000/executions`);
        const executions = await res.json();
        
        if (executions.length === 0) {
            auditTableBody.innerHTML = `<tr><td colspan="8" style="padding: 2rem; text-align: center; color: var(--text-dim);">No executions found.</td></tr>`;
            return;
        }
        
        auditTableBody.innerHTML = executions.map(e => {
            const statusColor = e.status === 'completed' ? 'var(--accent-green)' : (e.status === 'failed' ? 'var(--accent-red)' : 'var(--accent-blue)');
            return `
            <tr style="border-bottom: 1px solid var(--border-light); font-size: 0.95em;">
                <td style="padding: 1rem; color: var(--accent-purple); font-family: monospace;">...${String(e.id).substring(e.id.length - 8)}</td>
                <td style="padding: 1rem; font-weight: 500;">${e.workflow_name || 'Unknown'}</td>
                <td style="padding: 1rem;">${e.workflow_version || 1}</td>
                <td style="padding: 1rem; color: ${statusColor}; text-transform:uppercase;">${e.status}</td>
                <td style="padding: 1rem;">${e.started_by || 'system_user'}</td>
                <td style="padding: 1rem; font-family: monospace; color: var(--text-dim);">${new Date(e.started_at).toISOString()}</td>
                <td style="padding: 1rem; font-family: monospace; color: var(--text-dim);">${e.status === 'in_progress' ? '-' : (new Date(e.updated_at).toISOString())}</td>
                <td style="padding: 1rem;">
                   <a href="#" onclick="viewTrackerExecution('${e.id}'); return false;" style="color:var(--text-light);text-decoration:none;">View Logs</a>
                </td>
            </tr>`;
        }).join('');
    } catch(err) {
        auditTableBody.innerHTML = `<tr><td colspan="8" style="padding: 2rem; text-align: center; color: var(--accent-red);">Failed to load audit logs.</td></tr>`;
    }
}

window.viewTrackerExecution = (executionId) => {
    document.querySelector('[data-target="tracker"]').click();
    executionIdleState.classList.add('hidden');
    executionActiveState.classList.remove('hidden');
    activeExecutionId = executionId;
    if(pollInterval) clearInterval(pollInterval);
    fetchExecutionStatus(); // load it once passively (assuming it's complete, but poller can pick up if not)
};

// UI Workflow List Engine
async function loadWorkflows() {
  if (!workflowTableBody) return;
  workflowTableBody.innerHTML = `<tr><td colspan="6" style="padding: 2rem; text-align: center; color: var(--text-dim);">Loading workflows...</td></tr>`;
  try {
    const res = await fetch(`http://localhost:3000/workflows?page=${currentListState.page}&limit=${currentListState.limit}&search=${encodeURIComponent(currentListState.search)}`);
    const data = await res.json();
    
    currentListState.totalPages = data.totalPages || 1;
    totalCount.textContent = `Total: ${data.total}`;
    pageIndicator.textContent = `Page ${data.page} of ${currentListState.totalPages}`;
    
    btnPrevPage.disabled = data.page <= 1;
    btnNextPage.disabled = data.page >= currentListState.totalPages;

    if (data.data.length === 0) {
      workflowTableBody.innerHTML = `<tr><td colspan="6" style="padding: 2rem; text-align: center; color: var(--text-dim);">No workflows found.</td></tr>`;
      return;
    }

    workflowTableBody.innerHTML = data.data.map(w => `
      <tr style="border-bottom: 1px solid var(--border-light); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
        <td style="padding: 1rem; color: var(--accent-purple); font-family: monospace;">...${String(w.id).substring(w.id.length - 8)}</td>
        <td style="padding: 1rem; font-weight: 500;">${w.name}</td>
        <td style="padding: 1rem;">${w.steps ? w.steps.length : '-'}</td>
        <td style="padding: 1rem;">${w.version}</td>
        <td style="padding: 1rem;">
          <span style="background: rgba(16, 185, 129, 0.1); color: var(--accent-green); padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.8rem;">Active</span>
        </td>
        <td style="padding: 1rem; text-align: right; letter-spacing: 0.5rem;">
          <button class="btn-icon" title="Edit" onclick="editWorkflow('${w.id}')"><i class='bx bx-edit-alt'></i></button>
          <button class="btn-icon" title="Execute" onclick="triggerWorkflowExecution('${w.id}')"><i class='bx bx-play-circle'></i></button>
        </td>
      </tr>
    `).join('');
  } catch (e) {
    workflowTableBody.innerHTML = `<tr><td colspan="6" style="padding: 2rem; text-align: center; color: var(--accent-red);">Failed to load workflows. Is the server running?</td></tr>`;
  }
}

if (searchInput) {
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentListState.search = e.target.value;
      currentListState.page = 1; // reset page on search
      loadWorkflows();
    }, 400);
  });
}

if (btnPrevPage) btnPrevPage.addEventListener('click', () => { currentListState.page--; loadWorkflows(); });
if (btnNextPage) btnNextPage.addEventListener('click', () => { currentListState.page++; loadWorkflows(); });

if (btnCreateWorkflow) {
  btnCreateWorkflow.addEventListener('click', () => {
    // switch to designer
    document.querySelector('[data-target="designer"]').click();
    nodes = [];
    selectNode(null);
    renderCanvas();
    alert("Canvas cleared. Drag and drop nodes to create a new workflow, then export to save.");
  });
}

let currentEditingWorkflow = null;

window.editWorkflow = async (id) => {
  try {
    const res = await fetch(`http://localhost:3000/workflows/${id}`);
    const data = await res.json();
    document.querySelector('[data-target="editor"]').click();
    renderEditor(data);
  } catch (e) {
    console.error("Failed to load workflow for editing", e);
  }
};

function renderEditor(workflow) {
  currentEditingWorkflow = workflow;
  
  let schemaHtml = '';
  if (workflow.input_schema) {
    const keys = Object.keys(workflow.input_schema);
    if (keys.length > 0) {
      schemaHtml = keys.map(k => {
        const prop = workflow.input_schema[k];
        const reqStr = prop.required ? 'required' : 'optional';
        let allowedStr = prop.allowed_values ? ` (${prop.allowed_values.join('|')})` : '';
        return `- ${k}: ${prop.type || 'string'} (${reqStr})${allowedStr}`;
      }).join('\n');
    } else {
      schemaHtml = '(No schema defined)';
    }
  } else {
    schemaHtml = '(No schema defined)';
  }

  let stepsHtml = '';
  if (workflow.steps && workflow.steps.length > 0) {
    stepsHtml = workflow.steps.sort((a,b) => (a.order||0) - (b.order||0)).map((s, index) => {
       const stepType = s.step_type || 'task';
       return `${index + 1}. ${s.name} (${stepType}) <a href="#" onclick="editStep('${s.id}'); return false;" style="color:var(--text-dim);text-decoration:none;">[Edit]</a> <a href="#" onclick="openRuleEditor('${s.id}'); return false;" style="color:var(--accent-purple);text-decoration:none;">[Rules]</a> <a href="#" onclick="deleteStep('${s.id}'); return false;" style="color:var(--accent-red);text-decoration:none;">[Delete]</a>`;
    }).join('\n');
  } else {
    stepsHtml = '(No steps defined)';
  }

  editorContent.innerHTML = `
Workflow: <span style="color: var(--accent-yellow)">${workflow.name}</span> (Version ${workflow.version || 1}) <a href="#" onclick="editWorkflowDetails(); return false;" style="color:var(--text-dim);text-decoration:none;font-size:0.9em;">[Edit]</a>

Input Schema: <a href="#" onclick="editWorkflowSchema(); return false;" style="color:var(--text-dim);text-decoration:none;font-size:0.9em;">[Edit]</a>
${schemaHtml}

Steps:
${stepsHtml}

<br>
<a href="#" onclick="addNewStep(); return false;" style="color:var(--accent-green);text-decoration:none;font-weight:bold;">[Add New Step]</a>
  `.trim();
}

window.editWorkflowDetails = async () => {
    const newName = prompt("Enter new workflow name:", currentEditingWorkflow.name);
    if (newName && newName !== currentEditingWorkflow.name) {
        await fetch(`http://localhost:3000/workflows/${currentEditingWorkflow.id}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({name: newName})
        });
        window.editWorkflow(currentEditingWorkflow.id);
    }
};

window.editWorkflowSchema = async () => {
    const currentSchemaStr = JSON.stringify(currentEditingWorkflow.input_schema || {}, null, 2);
    const newSchemaStr = prompt("Edit JSON Schema:", currentSchemaStr);
    if (newSchemaStr && newSchemaStr !== currentSchemaStr) {
        try {
            const parsed = JSON.parse(newSchemaStr);
            await fetch(`http://localhost:3000/workflows/${currentEditingWorkflow.id}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({input_schema: parsed})
            });
            window.editWorkflow(currentEditingWorkflow.id);
        } catch(e) {
            alert("Invalid JSON format.");
        }
    }
};

window.deleteStep = async (stepId) => {
    if (confirm("Are you sure you want to delete this step?")) {
        await fetch(`http://localhost:3000/steps/${stepId}`, { method: 'DELETE' });
        window.editWorkflow(currentEditingWorkflow.id);
    }
};

window.addNewStep = async () => {
    const name = prompt("Enter Step Name:");
    if (!name) return;
    const type = prompt("Enter Step Type (task, approval, notification):", "task");
    if (!type) return;
    
    await fetch(`http://localhost:3000/workflows/${currentEditingWorkflow.id}/steps`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name, step_type: type, order: (currentEditingWorkflow.steps?.length||0) + 1})
    });
    window.editWorkflow(currentEditingWorkflow.id);
};

window.editStep = async (stepId) => {
    const step = currentEditingWorkflow.steps.find(s => s.id === stepId);
    if(!step) return;
    const newName = prompt("Edit Step Name:", step.name);
    if(newName) {
       await fetch(`http://localhost:3000/steps/${stepId}`, {
           method: 'PUT',
           headers: {'Content-Type': 'application/json'},
           body: JSON.stringify({name: newName})
       });
       window.editWorkflow(currentEditingWorkflow.id);
    }
};

let currentEditingStep = null;

window.backToWorkflowEditor = () => {
    document.querySelector('[data-target="editor"]').click();
};

window.openRuleEditor = async (stepId) => {
    const step = currentEditingWorkflow.steps.find(s => s.id === stepId);
    if (!step) return;
    
    currentEditingStep = step;
    ruleEditorStepName.textContent = step.name;
    
    document.querySelector('[data-target="editor"]').classList.remove('active'); // hacky visually
    if (editorView) editorView.classList.add('hidden');
    if (ruleEditorView) ruleEditorView.classList.remove('hidden');
    
    await loadRulesForStep();
};

async function loadRulesForStep() {
    rulesTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-dim);">Loading...</td></tr>`;
    try {
        const res = await fetch(`http://localhost:3000/steps/${currentEditingStep.id}/rules`);
        let rules = await res.json();
        
        rules.sort((a, b) => (a.priority || 0) - (b.priority || 0));
        
        if (rules.length === 0) {
            rulesTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-dim); padding:1rem;">No rules defined.</td></tr>`;
            return;
        }
        
        rulesTableBody.innerHTML = '';
        rules.forEach((rule, index) => {
            const tr = document.createElement('tr');
            tr.style.cssText = `border-bottom: 1px solid var(--border-light); cursor: grab; transition: background 0.2s;`;
            tr.setAttribute('draggable', 'true');
            tr.dataset.id = rule.id;
            tr.dataset.priority = rule.priority || index + 1;
            
            tr.innerHTML = `
                <td style="padding: 0.5rem;"><i class='bx bx-grid-vertical' style="color:var(--text-dim); margin-right:5px;"></i>${rule.priority || index + 1}</td>
                <td style="padding: 0.5rem; font-family: monospace; color: ${rule.condition === 'DEFAULT' ? 'var(--text-dim)' : 'var(--accent-blv)'};">${rule.condition}</td>
                <td style="padding: 0.5rem; color: var(--accent-green);">${rule.next_step_id || 'Terminates'}</td>
                <td style="padding: 0.5rem; text-align:right;">
                    <button class="btn-icon" onclick="editRule('${rule.id}')"><i class='bx bx-edit-alt'></i></button>
                    <button class="btn-icon" onclick="deleteRule('${rule.id}')"><i class='bx bx-trash'></i></button>
                </td>
            `;
            
            // Drag and Drop Logic
            tr.addEventListener('dragstart', handleDragStart);
            tr.addEventListener('dragover', handleDragOver);
            tr.addEventListener('drop', handleDrop);
            tr.addEventListener('dragend', handleDragEnd);
            
            rulesTableBody.appendChild(tr);
        });

    } catch(e) {
        rulesTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--accent-red);">Failed to load rules.</td></tr>`;
    }
}

let dragSrcEl = null;
function handleDragStart(e) {
    dragSrcEl = this;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    this.style.opacity = '0.4';
}
function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}
function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    if (dragSrcEl !== this) {
        const children = [...rulesTableBody.children];
        const srcIndex = children.indexOf(dragSrcEl);
        const tgtIndex = children.indexOf(this);
        
        if (srcIndex < tgtIndex) this.after(dragSrcEl);
        else this.before(dragSrcEl);
    }
    return false;
}
async function handleDragEnd(e) {
    this.style.opacity = '1';
    
    // Save new priorities structurally to API based on DOM arrangement
    const rows = [...rulesTableBody.querySelectorAll('tr')];
    
    // Disable UI during sync
    rulesTableBody.style.pointerEvents = 'none';
    rulesTableBody.style.opacity = '0.5';
    
    try {
        for (let i = 0; i < rows.length; i++) {
            const ruleId = rows[i].dataset.id;
            const newPriority = i + 1;
            if (rows[i].dataset.priority != newPriority) {
                 await fetch(`http://localhost:3000/rules/${ruleId}`, {
                     method: 'PUT',
                     headers: {'Content-Type': 'application/json'},
                     body: JSON.stringify({priority: newPriority})
                 });
            }
        }
        await loadRulesForStep(); // reload clean
    } catch(err) {
        console.error("Failed to reorder rules", err);
    }
    
    rulesTableBody.style.pointerEvents = 'auto';
    rulesTableBody.style.opacity = '1';
}

function validateSyntax(condition) {
    if (condition === 'DEFAULT') return true;
    try {
        new Function('data', `with(data) { return !!(${condition}); }`);
        return true;
    } catch (e) {
        return false;
    }
}

window.addNewRule = async () => {
    const condition = prompt("Enter Javascript evaluation condition (or 'DEFAULT'):\nExample: amount > 100 && country == 'US'");
    if (!condition) return;
    
    if (!validateSyntax(condition)) {
        if (!confirm("Validation Failed! The syntax you provided contains errors or won't evaluate correctly. Create it anyway?")) {
            return;
        }
    }
    
    const nextStepId = prompt("Enter 'Next Step ID' if condition matches (or leave blank to terminate):");
    
    // Auto-calculate highest priority
    const res = await fetch(`http://localhost:3000/steps/${currentEditingStep.id}/rules`);
    const existingRules = await res.json();
    const nextPriority = existingRules.length > 0 ? Math.max(...existingRules.map(r => r.priority || 0)) + 1 : 1;
    
    await fetch(`http://localhost:3000/steps/${currentEditingStep.id}/rules`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            condition: condition.trim(),
            next_step_id: nextStepId ? nextStepId.trim() : null,
            priority: nextPriority
        })
    });
    
    loadRulesForStep();
};

window.editRule = async (ruleId) => {
    const condition = prompt("Update Condition (will be validated!):");
    if(!condition) return;
    
    if (!validateSyntax(condition)) {
        alert("Syntax Validation Error. Rule update aborted to prevent runtime engine crashes.");
        return;
    }
    
    const nextStepId = prompt("Update Next Step ID:");
    
    await fetch(`http://localhost:3000/rules/${ruleId}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ condition: condition.trim(), next_step_id: nextStepId ? nextStepId.trim() : null })
    });
    
    loadRulesForStep();
};

window.deleteRule = async (ruleId) => {
    if (confirm("Are you sure you want to delete this rule?")) {
        await fetch(`http://localhost:3000/rules/${ruleId}`, { method: 'DELETE' });
        loadRulesForStep();
    }
};

let activeExecutionId = null;
let pollInterval = null;

window.triggerWorkflowExecution = async (id) => {
    document.querySelector('[data-target="tracker"]').click();
    
    executionIdleState.classList.remove('hidden');
    executionActiveState.classList.add('hidden');
    activeExecutionId = null;
    if(pollInterval) clearInterval(pollInterval);
    
    executionInputForm.innerHTML = `<div style="text-align:center; padding:2rem;">Loading workflow schema...</div>`;
    
    try {
        const res = await fetch(`http://localhost:3000/workflows/${id}`);
        const workflow = await res.json();
        
        let formHtml = `
           <div style="margin-bottom: 2rem; font-weight: bold; font-size: 1.1em;">Workflow: <span style="color:var(--accent-yellow);">${workflow.name}</span></div>
           <form id="workflow-execution-form" onsubmit="startExecution(event, '${id}')">
        `;
        
        if (workflow.input_schema) {
           for (const [key, rules] of Object.entries(workflow.input_schema)) {
               formHtml += `<div style="margin-bottom: 1rem;">
                  <label style="display:block; margin-bottom: 0.3rem;">- ${key}: ${rules.type || 'string'} ${rules.required ? '(required)' : ''}</label>
                  <input type="text" name="${key}" ${rules.required ? 'required' : ''} class="form-control" style="width:100%; border: 1px solid var(--border-light); background:var(--bg-dark); color:var(--text-light); padding:0.5rem; border-radius:4px; font-family:monospace;" placeholder="Enter ${key}..."/>
               </div>`;
           }
        } else {
            formHtml += `<div style="margin-bottom: 1rem; color:var(--text-dim);">No input schema defined for this workflow.</div>`;
        }
        
        formHtml += `
            <div style="margin-top: 2rem;">
               <button type="submit" class="btn-primary" style="background:var(--accent-blue); padding: 0.8rem 1.5rem; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">[Start Execution]</button>
            </div>
        </form>`;
        
        executionInputForm.innerHTML = formHtml;
    } catch(e) {
        executionInputForm.innerHTML = `<div style="color:var(--accent-red); padding:2rem;">Failed to load workflow data.</div>`;
    }
};

window.startExecution = async (e, workflowId) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    let inputData = {};
    formData.forEach((value, key) => { inputData[key] = isNaN(value) ? value : Number(value); });

    try {
        const res = await fetch(`http://localhost:3000/workflows/${workflowId}/execute`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(inputData)
        });
        const execData = await res.json();
        
        activeExecutionId = execData.id;
        executionIdleState.classList.add('hidden');
        executionActiveState.classList.remove('hidden');
        
        overallStatusBadge.textContent = 'IN_PROGRESS';
        overallStatusBadge.style.background = 'rgba(59, 130, 246, 0.2)';
        overallStatusBadge.style.color = 'var(--accent-blue)';
        
        if(pollInterval) clearInterval(pollInterval);
        pollInterval = setInterval(fetchExecutionStatus, 1000); // Polling every second for visual updates
        fetchExecutionStatus(); // Initial fetch
        
    } catch(err) {
        alert("Failed to start execution!");
    }
};

async function fetchExecutionStatus() {
    if (!activeExecutionId) return;
    try {
        const res = await fetch(`http://localhost:3000/executions/${activeExecutionId}`);
        const execution = await res.json();
        
        if (execution.status === 'completed') {
            overallStatusBadge.textContent = 'COMPLETED';
            overallStatusBadge.style.background = 'rgba(16, 185, 129, 0.2)';
            overallStatusBadge.style.color = 'var(--accent-green)';
            clearInterval(pollInterval);
        } else if (execution.status === 'failed') {
            overallStatusBadge.textContent = 'FAILED';
            overallStatusBadge.style.background = 'rgba(239, 68, 68, 0.2)';
            overallStatusBadge.style.color = 'var(--accent-red)';
            clearInterval(pollInterval);
        }
        
        // Render step progress
        if (execution.step_executions && execution.step_executions.length > 0) {
            const currentStep = execution.step_executions[execution.step_executions.length - 1];
            executionProgressBanner.innerHTML = `
                <div style="margin-bottom:0.5rem;"><span style="color:var(--accent-yellow)">Current Step:</span> ${currentStep.step_name || currentStep.step_id} (${currentStep.step_type})</div>
                <div><span style="color:var(--accent-purple)">Status / Approver:</span> ${currentStep.status} | <i class='bx bx-user' style="margin:0 4px;"></i>${currentStep.approver || 'System'}</div>
            `;
            
            // Render detailed log outputs matching structured mock
            executionStructuredLogs.innerHTML = execution.step_executions.map((s, idx) => {
                const rulesStr = s.rules_evaluated.map(r => JSON.stringify(r)).join(', ');
                const rulesBlock = s.rules_evaluated.length > 0 ? `Rules evaluated: [${rulesStr}]\n` : '';
                return `
<div style="background:var(--bg-panel); border-radius:6px; border-left: 3px solid ${s.status === 'Completed' ? 'var(--accent-green)' : (s.status === 'Failed' ? 'var(--accent-red)' : 'var(--accent-blue)')}; padding:1rem; margin-bottom:1rem; white-space:pre-wrap;">[Step ${idx + 1}] <span style="color:var(--accent-yellow);">${s.step_name || 'System Step'}</span>
${rulesBlock}Next Step: ${s.next_step_name || s.next_step || 'Terminates'}
Status: ${s.status}
Approver: ${s.approver || 'System'}
Duration: ${s.duration || '0s'}</div>
                `.trim();
            }).join('\n');
            
        } else {
             executionProgressBanner.innerHTML = `<div>Initializing engine...</div>`;
        }
        
    } catch (e) {
         console.warn("Polling interrupted", e);
    }
}

// Initialize Application state
document.addEventListener('DOMContentLoaded', () => {
    const listTab = document.querySelector('[data-target="list"]');
    if (listTab) {
        listTab.click();
    }
});

// Execution Engine Overlay
btnExecute.addEventListener('click', () => {
  if (nodes.length === 0) {
    alert("Please build a workflow first by dragging nodes to the canvas.");
    return;
  }
  executionModal.classList.remove('hidden');
});

closeModalBtn.addEventListener('click', () => {
  executionModal.classList.add('hidden');
});

// Export JSON feature logic
btnExport.addEventListener('click', () => {
  if (nodes.length === 0) {
    alert("Canvas is empty. Add nodes to generate the workflow schema.");
    return;
  }

  let parsedSchema = {};
  try {
    const schemaInputEl = document.getElementById('workflow-schema-input');
    parsedSchema = JSON.parse(schemaInputEl.value);
  } catch (e) {
    alert("Invalid JSON format in the Input Schema tab. Please correct it before exporting.");
    return;
  }

  const generatedWorkflowId = generateId();
  const timestamp = new Date().toISOString();

  // Create the Workflow Object matching Core Concepts 1.1 schema
  const workflowSchema = {
    id: generatedWorkflowId,
    name: nodes[0].name || "New Workflow",
    version: 1,
    is_active: true,
    input_schema: parsedSchema,
    start_step_id: nodes[0].id,
    created_at: timestamp,
    updated_at: timestamp,
    // Step mapping matching Core Concepts 1.2 schema
    steps: nodes.map((n, index) => {
      let stepType = 'task';
      if (n.type === 'approval') stepType = 'approval';
      if (n.type === 'notification') stepType = 'notification';

      return {
        id: n.id,
        workflow_id: generatedWorkflowId,
        name: n.name,
        step_type: stepType,
        order: index + 1,
        metadata: n.config,
        created_at: timestamp,
        updated_at: timestamp
      };
    })
  };

  exportDataEl.value = JSON.stringify(workflowSchema, null, 2);
  exportModal.classList.remove('hidden');
});

closeExportBtn.addEventListener('click', () => {
  exportModal.classList.add('hidden');
});

// Log rendering
function addLog(type, message, details = null) {
  const time = new Date().toLocaleTimeString();
  const li = document.createElement('li');
  li.className = `log-entry ${type}`;

  let html = `
    <div><i class='bx'></i> <strong>${message}</strong></div>
    <div class="log-time">${time}</div>
  `;

  if (details) {
    html += `<pre>${JSON.stringify(details, null, 2)}</pre>`;
  }

  li.innerHTML = html;

  // Icon based on type
  const icon = li.querySelector('.bx');
  if (type === 'success') icon.classList.add('bx-check-circle');
  if (type === 'error') icon.classList.add('bx-x-circle');
  if (type === 'warning') icon.classList.add('bx-error');
  if (type === 'info') icon.classList.add('bx-info-circle');

  executionLog.prepend(li);
}

// Engine execution
const sleep = ms => new Promise(r => setTimeout(r, ms));

startSimulationBtn.addEventListener('click', async () => {
  executionModal.classList.add('hidden');

  // switch to tracker tab
  document.querySelector('[data-target="tracker"]').click();
  executionLog.innerHTML = `<li class="log-entry info"><i class='bx bx-play'></i> Starting execution sequence...</li>`;

  let inputData;
  try {
    inputData = JSON.parse(inputDataEl.value);
  } catch (e) {
    addLog('error', 'Failed to parse JSON input data.', e.message);
    return;
  }

  // Setup execution record based on 1.4 Execution schema
  const executionRecord = {
    id: generateId(),
    workflow_id: generateId(), // Simulated DB relations
    workflow_version: 1,
    status: 'in_progress',
    data: inputData,
    logs: [],
    current_step_id: null,
    retries: 0,
    triggered_by: generateId(), // Simulated user ID
    started_at: new Date().toISOString(),
    ended_at: null
  };

  addLog('info', 'Input Payload received', inputData);

  let workflowFailed = false;

  // Traverse sequentially
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    executionRecord.current_step_id = node.id;
    await sleep(800);

    const c = node.config;

    let stepType = 'task';
    if (node.type === 'approval') stepType = 'approval';
    if (node.type === 'notification') stepType = 'notification';

    const stepLog = {
      step_name: node.name,
      step_type: stepType,
      evaluated_rules: [],
      selected_next_step: null,
      status: "in_progress",
      approver_id: null,
      error_message: null,
      started_at: new Date().toISOString(),
      ended_at: null
    };

    switch (node.type) {
      case 'trigger':
        addLog('success', `[${node.name}] Trigger activated via: ${c.event}`);
        break;

      case 'action':
        addLog('success', `[${node.name}] Action Processed`, { script: c.script, status: "completed" });
        break;

      case 'decision':
        addLog('info', `[${node.name}] Evaluating Routing Rules...`);
        let ruleMatched = false;

        if (c.rules) {
          const rulesList = c.rules.split('\\n');
          for (let ruleString of rulesList) {
            const parts = ruleString.split('|').map(s => s.trim());
            if (parts.length < 3) continue;

            const condition = parts[1];
            const nextStep = parts[2];

            if (condition === 'DEFAULT') {
              stepLog.evaluated_rules.push({ rule: condition, result: true });
              stepLog.selected_next_step = nextStep;
              addLog('warning', `[${node.name}] Unmatched. Fallback 'DEFAULT' triggered -> Route to: ${nextStep}`);
              ruleMatched = true;
              break;
            }

            // Pseudo logical evaluator restricted for matching demo scenario.
            // Dynamically evaluating strings safely in JS is complex without sandboxing.
            // Using placeholder parser that explicitly looks for matches in inputData object properties.
            let conditionMet = true;

            try {
              // A very basic parser designed specifically around the provided UI demo example structure
              // amount > 100 && country == 'US' && priority == 'High'
              const subConditions = condition.split('&&').map(s => s.trim());

              for (let sub of subConditions) {
                let field, op, val;
                if (sub.includes('>=')) { [field, val] = sub.split('>='); op = '>='; }
                else if (sub.includes('<=')) { [field, val] = sub.split('<='); op = '<='; }
                else if (sub.includes('>')) { [field, val] = sub.split('>'); op = '>'; }
                else if (sub.includes('<')) { [field, val] = sub.split('<'); op = '<'; }
                else if (sub.includes('==')) { [field, val] = sub.split('=='); op = '=='; }
                else if (sub.includes('!=')) { [field, val] = sub.split('!='); op = '!='; }
                else { continue; } // unknown operator

                field = field.trim();
                val = val.trim().replace(/'/g, ''); // strip quotes

                const inputVal = inputData[field];
                if (inputVal === undefined) { conditionMet = false; break; }

                const numInputVal = isNaN(inputVal) ? inputVal : Number(inputVal);
                const numVal = isNaN(val) ? val : Number(val);

                if (op === '>' && !(numInputVal > numVal)) conditionMet = false;
                if (op === '<' && !(numInputVal < numVal)) conditionMet = false;
                if (op === '>=' && !(numInputVal >= numVal)) conditionMet = false;
                if (op === '<=' && !(numInputVal <= numVal)) conditionMet = false;
                if (op === '==' && !(numInputVal == numVal)) conditionMet = false;
                if (op === '!=' && !(numInputVal != numVal)) conditionMet = false;

                if (!conditionMet) break; // one failed sub-condition fails the main condition
              }

              stepLog.evaluated_rules.push({ rule: condition, result: conditionMet });

              if (conditionMet) {
                stepLog.selected_next_step = nextStep;
                addLog('success', `[${node.name}] Condition [${condition}] MATCHED -> Route to: ${nextStep}`);
                ruleMatched = true;
                break;
              }
            } catch (e) {
              console.warn("Rule parsing failed:", e);
            }
          }
        }

        if (!ruleMatched) {
          stepLog.error_message = "No conditions matched and no DEFAULT found. Halting.";
          addLog('error', `[${node.name}] ${stepLog.error_message}`);
          workflowFailed = true;
        }
        break;

      case 'notification':
        addLog('info', `[${node.name}] Sent Notification to: ${c.email}`, { message: c.message });
        break;

      case 'approval':
        addLog('warning', `[${node.name}] Pending Approval from: ${c.assignee_email}`);
        stepLog.approver_id = c.assignee_email; // mock id based on config
        addLog('info', `Simulation paused for approval response... Auto-approving for demo.`);
        await sleep(1500);
        addLog('success', `[${node.name}] Process Approved.`);
        break;
    }

    stepLog.ended_at = new Date().toISOString();
    stepLog.status = workflowFailed ? "failed" : "completed";
    executionRecord.logs.push(stepLog);

    if (workflowFailed) break;
  }

  await sleep(500);

  // Finalize execution record
  executionRecord.status = workflowFailed ? 'failed' : 'completed';
  executionRecord.current_step_id = null;
  executionRecord.ended_at = new Date().toISOString();

  if (workflowFailed) {
    addLog('error', '❌ Workflow execution failed.');
  } else {
    addLog('success', '✅ Workflow execution successfully completed!');
  }

  // Display the generated Execution Schema entity output directly into the UI log
  addLog('info', 'Generated Execution Entity Schema (Concept 1.4 / 1.5)', executionRecord);
});
