// TASK MANAGER
// Vistula Student ID: 73206

let settings = {};
let tasks = [];
let editingTaskId = null;
let currentFilter = "all";

// Get the HTML elements we need
const taskForm = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const descriptionInput = document.getElementById("task-description");
const submitButton = document.getElementById("task-submit");
const taskList = document.getElementById("task-list");
const statusMessage = document.getElementById("status-message");


// Display messages to the user
function showMessage(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? "#b84a62" : "#658a70";
}


// Communicate with the Supabase REST API
async function apiRequest(method, endpoint, data = null) {

    const url =
        `${settings.supabaseUrl}/rest/v1/${settings.tableName}${endpoint}`;

    const options = {
        method: method,
        headers: {
            "apikey": settings.supabasePublishableKey,
            "Content-Type": "application/json"
        }
    };

    if (data !== null) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Database error: ${errorText}`);
    }

    if (response.status === 204) {
        return null;
    }

    const responseText = await response.text();

    return responseText ? JSON.parse(responseText) : null;
}


// Load tasks from Supabase
async function loadTasks() {
    try {
        tasks = await apiRequest(
            "GET",
            "?select=*&order=id.asc"
        );

        displayTasks();
        updateDashboard();

    } catch (error) {
        showMessage(error.message, true);
    }
}


// Display tasks on the website
function displayTasks() {

    taskList.innerHTML = "";

    let visibleTasks = tasks;

    if (currentFilter === "pending") {
        visibleTasks = tasks.filter(task => !task.completed);
    }

    if (currentFilter === "completed") {
        visibleTasks = tasks.filter(task => task.completed);
    }

    if (visibleTasks.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "empty-message";
        emptyMessage.textContent =
            "No tasks to show. A fresh start! 🌸";

        taskList.appendChild(emptyMessage);
        return;
    }

    visibleTasks.forEach(task => {

        const taskCard = document.createElement("div");

        taskCard.className =
            task.completed ? "task-item completed" : "task-item";

        taskCard.dataset.id = task.id;

        const title = document.createElement("h3");
        title.className = "task-title";
        title.textContent = task.title;

        const description = document.createElement("p");
        description.className = "task-description";
        description.textContent = task.description || "";

        const status = document.createElement("p");
        status.className = "task-status";
        status.textContent =
            task.completed ? "✅ Completed" : "⏳ Pending";

        const actions = document.createElement("div");
        actions.className = "task-actions";

        // Complete / Incomplete button
        const toggleButton = document.createElement("button");
        toggleButton.className = "toggle-task";
        toggleButton.textContent =
            task.completed ? "Mark Incomplete" : "Complete";

        toggleButton.addEventListener("click", () => {
            toggleTask(task.id, task.completed);
        });

        // Edit button
        const editButton = document.createElement("button");
        editButton.className = "edit-task";
        editButton.textContent = "Edit";

        editButton.addEventListener("click", () => {
            startEditing(task);
        });

        // Delete button
        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-task";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            deleteTask(task.id);
        });

        actions.appendChild(toggleButton);
        actions.appendChild(editButton);
        actions.appendChild(deleteButton);

        taskCard.appendChild(title);
        taskCard.appendChild(description);
        taskCard.appendChild(status);
        taskCard.appendChild(actions);

        taskList.appendChild(taskCard);
    });
}


// Update the dashboard and progress tracker
function updateDashboard() {

    const total = tasks.length;

    const completed = tasks.filter(
        task => task.completed
    ).length;

    const pending = total - completed;

    const percentage =
        total === 0 ? 0 : Math.round((completed / total) * 100);

    document.getElementById("total-tasks").textContent = total;

    document.getElementById("pending-tasks").textContent = pending;

    document.getElementById("completed-tasks").textContent = completed;

    document.getElementById("progress-fill").style.width =
        percentage + "%";

    document.getElementById("progress-percentage").textContent =
        percentage + "% completed";

    const message = document.getElementById("progress-message");

    if (total === 0) {
        message.textContent = "Every little step counts! 🌸";
    } else if (percentage === 100) {
        message.textContent = "Everything is done! You did it! 🎉";
    } else if (percentage >= 50) {
        message.textContent = "You're making great progress! 💜";
    } else {
        message.textContent = "Keep going, you've got this! 🌷";
    }
}


// Add or update a task
taskForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();

    if (!title) {
        showMessage("Please enter a task title.", true);
        return;
    }

    submitButton.disabled = true;

    try {

        if (editingTaskId === null) {

            await apiRequest("POST", "", {
                title: title,
                description: description,
                completed: false
            });

            showMessage("Task added successfully! 🌸");

        } else {

            await apiRequest(
                "PATCH",
                `?id=eq.${editingTaskId}`,
                {
                    title: title,
                    description: description
                }
            );

            showMessage("Task updated successfully! 💜");
        }

        resetForm();
        await loadTasks();

    } catch (error) {
        showMessage(error.message, true);
    } finally {
        submitButton.disabled = false;
    }
});


// Fill the form when editing
function startEditing(task) {

    editingTaskId = task.id;

    titleInput.value = task.title;
    descriptionInput.value = task.description || "";

    submitButton.textContent = "Save Changes";

    titleInput.focus();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// Reset the form
function resetForm() {
    editingTaskId = null;
    taskForm.reset();
    submitButton.textContent = "+ Add Task";
}


// Mark a task completed or incomplete
async function toggleTask(id, completed) {

    try {

        await apiRequest(
            "PATCH",
            `?id=eq.${id}`,
            { completed: !completed }
        );

        showMessage("Task status updated! ✨");

        await loadTasks();

    } catch (error) {
        showMessage(error.message, true);
    }
}


// Delete a task
async function deleteTask(id) {

    const confirmed = confirm(
        "Are you sure you want to delete this task?"
    );

    if (!confirmed) return;

    try {

        await apiRequest(
            "DELETE",
            `?id=eq.${id}`
        );

        if (editingTaskId === id) {
            resetForm();
        }

        showMessage("Task deleted successfully.");

        await loadTasks();

    } catch (error) {
        showMessage(error.message, true);
    }
}


// Filter tasks
document.querySelectorAll(".filter-btn").forEach(button => {

    button.addEventListener("click", function() {

        currentFilter = button.dataset.filter;

        document.querySelectorAll(".filter-btn").forEach(btn => {
            btn.classList.remove("active");
        });

        button.classList.add("active");

        displayTasks();
    });
});


// Start the application
async function startApp() {

    try {

        const response = await fetch("config.json");

        if (!response.ok) {
            throw new Error("Could not load config.json");
        }

        settings = await response.json();

        if (
            !settings.supabaseUrl ||
            !settings.supabasePublishableKey ||
            settings.tableName !== "tasks"
        ) {
            throw new Error("Supabase configuration is incomplete.");
        }

        await loadTasks();

    } catch (error) {
        showMessage(error.message, true);
    }
}

startApp();
