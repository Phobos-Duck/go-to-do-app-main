package models

type ToDoList struct {
	ID       int    `json:"id"`
	TextTask string `json:"text_task"`
	Comment  string `json:"comment"`
	WorkerID int    `json:"worker_id"`
	Time     string `json:"time"`
	Status   bool   `json:"status"`
}

type Worker struct {
	ID   int    `json:"id,omitempty"`
	Name string `json:"name"`
}
