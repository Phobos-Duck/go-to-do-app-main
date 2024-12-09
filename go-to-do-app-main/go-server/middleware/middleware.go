package middleware

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/mux"
	"go-server/models"

	_ "github.com/mattn/go-sqlite3"
)

// DB instance
var db *sql.DB

// Initialize the database and create table
func init() {
	createDBInstance()
}

func createDBInstance() {
	dbFile := "tasks.db"

	var err error
	db, err = sql.Open("sqlite3", dbFile)
	if err != nil {
		log.Fatal(err)
	}

	createTableTasks := `CREATE TABLE IF NOT EXISTS tasks (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		text_task TEXT NOT NULL,
		comment TEXT,
		worker_id INTEGER,
		time TEXT,
		status BOOLEAN DEFAULT 0
	);`

	createTableWorkers := `CREATE TABLE IF NOT EXISTS workers (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL
	);`

	_, err = db.Exec(createTableTasks)
	if err != nil {
		log.Fatal(err)
	}

	_, err = db.Exec(createTableWorkers)
	if err != nil {
		log.Fatal(err)
	}
}

func GetAllWorkers(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	rows, err := db.Query("SELECT id, name FROM workers")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	var workers []map[string]interface{}
	for rows.Next() {
		var id int
		var name string
		if err := rows.Scan(&id, &name); err != nil {
			log.Fatal(err)
		}
		workers = append(workers, map[string]interface{}{
			"id":   id,
			"name": name,
		})
	}
	json.NewEncoder(w).Encode(workers)
}

// GetAllTask retrieves all tasks
func GetAllTask(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	tasks := getAllTasks()
	json.NewEncoder(w).Encode(tasks)
}

// CreateTask adds a new task
func CreateTask(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	var task models.ToDoList
	if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
		log.Printf("Error decoding request body: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid task format"})
		return
	}

	// Проверка обязательного поля
	if task.TextTask == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "task name is required"})
		return
	}

	// Вставка данных
	err := insertOneTask(task)
	if err != nil {
		log.Printf("Error inserting task: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "failed to insert task"})
		return
	}

	// Возвращаем успешный ответ
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"message": "task added successfully"})
}

// UpdateTask modifies an existing task
func UpdateTask(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	params := mux.Vars(r)

	var task models.ToDoList
	if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid task format"})
		return
	}

	err := updateTaskByID(params["id"], task)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "unable to update task"})
		return
	}

	json.NewEncoder(w).Encode(task)
}

// DeleteTask removes a single task by ID
func DeleteTask(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	params := mux.Vars(r)
	err := deleteOneTask(params["id"])
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "unable to delete task"})
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "task deleted"})
}

// DeleteAllTask removes all tasks from the database
func DeleteAllTask(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	count, err := deleteAllTasks()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "unable to delete all tasks"})
		return
	}

	json.NewEncoder(w).Encode(map[string]int{"deleted": count})
}

// getAllTasks fetches all tasks from the database
func getAllTasks() []models.ToDoList {
	rows, err := db.Query("SELECT id, text_task, comment, worker_id, time FROM tasks")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	var tasks []models.ToDoList
	for rows.Next() {
		var task models.ToDoList
		if err := rows.Scan(&task.ID, &task.TextTask, &task.Comment, &task.WorkerID, &task.Time); err != nil {
			log.Fatal(err)
		}
		tasks = append(tasks, task)
	}

	if err := rows.Err(); err != nil {
		log.Fatal(err)
	}
	return tasks
}

// insertOneTask inserts a new task into the database
func insertOneTask(task models.ToDoList) error {
	stmt, err := db.Prepare("INSERT INTO tasks (text_task, comment, worker_id, time) VALUES (?, ?, ?, ?)")
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.Exec(task.TextTask, task.Comment, task.WorkerID, task.Time)
	return err
}

// updateTaskByID updates a task's details in the database
func updateTaskByID(id string, task models.ToDoList) error {
	stmt, err := db.Prepare("UPDATE tasks SET text_task = ?, comment = ?, worker_id = ?, time = ? WHERE id = ?")
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.Exec(task.TextTask, task.Comment, task.WorkerID, task.Time, id)
	return err
}

// deleteOneTask removes a task by its ID
func deleteOneTask(id string) error {
	stmt, err := db.Prepare("DELETE FROM tasks WHERE id = ?")
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.Exec(id)
	return err
}

// deleteAllTasks removes all tasks from the database
func deleteAllTasks() (int, error) {
	stmt, err := db.Prepare("DELETE FROM tasks")
	if err != nil {
		return 0, err
	}
	defer stmt.Close()

	res, err := stmt.Exec()
	if err != nil {
		return 0, err
	}

	count, err := res.RowsAffected()
	if err != nil {
		return 0, err
	}

	return int(count), nil
}

// Обновление статуса задачи (завершена или нет)
func UpdateTaskStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	params := mux.Vars(r)

	var task models.ToDoList
	if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid task format"})
		return
	}

	err := updateTaskStatusByID(params["id"], task.Status)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "unable to update task status"})
		return
	}

	json.NewEncoder(w).Encode(task)
}

func updateTaskStatusByID(id string, status bool) error {
	stmt, err := db.Prepare("UPDATE tasks SET status = ? WHERE id = ?")
	if err != nil {
		return err
	}
	defer stmt.Close()

	_, err = stmt.Exec(status, id)
	return err
}
