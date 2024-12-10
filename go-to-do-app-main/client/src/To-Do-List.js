import React, { Component } from "react";
import axios from "axios";
import "./To-Do.css";
import { Card, Header, Form, Input, Button, Dropdown } from "semantic-ui-react";
import { CONSTANTS } from "./constants";

let endpoint = "http://localhost:8080";

class ToDoList extends Component {
    constructor(props) {
        super(props);

        this.state = {
            task: "",
            comment: "",
            worker: "",
            time: "",
            items: [],
            workers: [],
            error: "",
            editingTaskId: null, // ID задачи, которую редактируем
            editTaskInput: {},
            selectedSourceLanguage: "ru",
            selectedTargetLanguage: "en",
            languages: [
                { key: "en", text: "English", value: "en" },
                { key: "de", text: "Deutsch", value: "de" },
                { key: "kk", text: "Қазақша", value: "kk" },
                { key: "ru", text: "Русский", value: "ru" },
            ],
        };
    }

    componentDidMount() {
        this.getTask();
        this.getWorkers();
    }

    getWorkers = () => {
        axios
            .get(endpoint + "/api/workers")
            .then((res) => {
                if (Array.isArray(res.data)) {
                    this.setState({
                        workers: res.data.map((worker) => ({
                            id: worker.id,
                            name: worker.name,
                        })),
                    });
                } else {
                    this.setState({ error: "Failed to load workers" });
                }
            })
            .catch((error) => {
                console.error("Error fetching workers:", error);
                this.setState({ error: "Failed to load workers" });
            });
    };

    getTask = () => {
        axios
            .get(endpoint + "/api/task")
            .then((res) => {
                if (Array.isArray(res.data)) {
                    this.setState({ items: res.data });
                } else {
                    this.setState({ items: [], error: "Failed to load tasks" });
                }
            })
            .catch((error) => {
                console.error("Error fetching tasks:", error);
                this.setState({ items: [], error: "Failed to load tasks" });
            });
    };

    onChange = (event, { name, value }) => {
        this.setState({
            [name]: value,
        });
    };

    onSubmit = () => {
        const { task, comment, worker, time } = this.state;

        if (task && worker) {
            axios
                .post(endpoint + "/api/task", {
                    text_task: task,
                    comment: comment,
                    worker_id: worker,
                    time: time,
                })
                .then(() => {
                    this.getTask();
                    this.setState({ task: "", comment: "", worker: "", time: "", error: "" });
                })
                .catch((error) => {
                    console.error("Error submitting task:", error.response?.data || error.message);
                    this.setState({ error: "Ошибка при добавлении задачи. Пожалуйста попробуйте ещё раз" });
                });
        } else {
            this.setState({ error: "Пожалуйста заполните все обязательные поля" });
        }
    };

    markComplete = (id) => {
        axios
            .put(endpoint + `/api/task/${id}`, { status: true })
            .then(() => this.getTask())
            .catch((error) => console.error("Error marking task as complete:", error));
    };

    undoTask = (id) => {
        axios
            .put(endpoint + `/api/task/${id}`, { status: false })
            .then(() => this.getTask())
            .catch((error) => console.error("Error undoing task completion:", error));
    };

    deleteTask = (id) => {
        axios
            .delete(endpoint + `/api/task/${id}`)
            .then(() => this.getTask())
            .catch((error) => console.error("Error deleting task:", error));
    };

    translateTasks = () => {
        const { selectedSourceLanguage, selectedTargetLanguage } = this.state;

        axios
            .post(endpoint + "/api/translateTasks", {
                sourceLanguage: selectedSourceLanguage,
                targetLanguage: selectedTargetLanguage,
            })
            .then(() => {
                this.getTask();
                alert("Задачи переведены успешно!");
            })
            .catch((error) => {
                console.error("Ошибка перевода задач:", error);
                let errorMessage = "Ошибка перевода задач";
                if (error.response?.data?.error?.includes("Пожалуйста попробуйте сначала перевести на английский язык")) {
                    errorMessage += " Попробуйте сначала перевести на английский язык";
                }
                this.setState({ error: errorMessage });
            });
    };

    startEditing = (task) => {
        this.setState({
            editingTaskId: task.id,
            editTaskInput: {
                text_task: task.text_task,
                comment: task.comment,
                worker_id: task.worker_id,
                time: task.time,
            },
        });
    };

    handleEditChange = (e, { name, value }) => {
        this.setState((prevState) => ({
            editTaskInput: { ...prevState.editTaskInput, [name]: value },
        }));
    };

    saveTaskChanges = () => {
        const { editingTaskId, editTaskInput } = this.state;

        axios
            .put(endpoint + `/api/task/${editingTaskId}`, {
                text_task: editTaskInput.text_task,
                comment: editTaskInput.comment,
                worker_id: editTaskInput.worker_id,
                time: editTaskInput.time,
            })
            .then(() => {
                this.getTask();
                this.setState({ editingTaskId: null, editTaskInput: {} });
            })
            .catch((error) => {
                console.error("Error saving task changes:", error);
                this.setState({ error: "Ошибка сохранения изменений" });
            });
    };

    formatDate = (dateString) => {
        const options = { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" };
        return new Date(dateString).toLocaleDateString("ru-RU", options);
    };

    render() {
        const { workers, items, error, languages, selectedSourceLanguage, selectedTargetLanguage } = this.state;

        const getWorkerName = (workerId) => {
            const worker = workers.find((w) => w.id === workerId);
            return worker ? worker.name : "Неизвестно";
        };

        return (
            <div>
                <Header as="h2" className="header">
                    {CONSTANTS.HEADER_TEXT}
                </Header>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginBottom: "10px" }}>
                    <Dropdown
                        placeholder="Исходный язык"
                        fluid
                        selection
                        options={languages}
                        value={selectedSourceLanguage}
                        onChange={(e, { value }) => this.setState({ selectedSourceLanguage: value })}
                    />
                    <Dropdown
                        placeholder="Перевести на..."
                        fluid
                        selection
                        options={languages}
                        value={selectedTargetLanguage}
                        onChange={(e, { value }) => this.setState({ selectedTargetLanguage: value })}
                    />
                    <Button onClick={this.translateTasks} color="blue">
                        Перевести задачи
                    </Button>
                </div>

                <Form onSubmit={this.onSubmit}>
                    <Input
                        type="text"
                        name="task"
                        placeholder={CONSTANTS.TASK_PLACEHOLDER}
                        value={this.state.task}
                        onChange={this.onChange}
                        fluid
                    />
                    <Input
                        type="text"
                        name="comment"
                        placeholder={CONSTANTS.COMMENT_PLACEHOLDER}
                        value={this.state.comment}
                        onChange={this.onChange}
                        fluid
                    />
                    <Dropdown
                        placeholder={CONSTANTS.WORKER_PLACEHOLDER}
                        fluid
                        selection
                        name="worker"
                        options={workers.map((worker) => ({
                            key: worker.id,
                            text: worker.name,
                            value: worker.id,
                        }))}
                        value={this.state.worker}
                        onChange={this.onChange}
                    />
                    <Input
                        type="datetime-local"
                        name="time"
                        placeholder={CONSTANTS.TIME_PLACEHOLDER}
                        value={this.state.time}
                        onChange={this.onChange}
                        fluid
                    />
                    <Button type="submit" primary>
                        {CONSTANTS.ADD_TASK_BUTTON}
                    </Button>
                </Form>

                {error && <div style={{ color: "red" }}>{error}</div>}

                {items.length > 0 ? (
                    <Card.Group>
                        {items.map((item) => {
                            const isEditing = this.state.editingTaskId === item.id;

                            return (
                                <Card key={item.id} color="blue" fluid>
                                    <Card.Content>
                                        {!isEditing ? (
                                            <>
                                                <Card.Header>{item.text_task}</Card.Header>
                                                <Card.Meta>{`Ответственный: ${getWorkerName(item.worker_id)}, Сроки до: ${this.formatDate(item.time)}`}</Card.Meta>
                                                <Card.Description>{item.comment}</Card.Description>
                                            </>
                                        ) : (
                                            <>
                                                <Input
                                                    fluid
                                                    placeholder="Task name"
                                                    name="text_task"
                                                    value={this.state.editTaskInput.text_task}
                                                    onChange={this.handleEditChange}
                                                />
                                                <Input
                                                    fluid
                                                    placeholder="Comment"
                                                    name="comment"
                                                    value={this.state.editTaskInput.comment}
                                                    onChange={this.handleEditChange}
                                                />
                                                <Dropdown
                                                    fluid
                                                    placeholder="Select worker"
                                                    name="worker_id"
                                                    selection
                                                    options={workers.map((worker) => ({
                                                        key: worker.id,
                                                        text: worker.name,
                                                        value: worker.id,
                                                    }))}
                                                    value={this.state.editTaskInput.worker_id}
                                                    onChange={this.handleEditChange}
                                                />
                                                <Input
                                                    type="datetime-local"
                                                    placeholder="Deadline"
                                                    name="time"
                                                    value={this.state.editTaskInput.time}
                                                    onChange={this.handleEditChange}
                                                    fluid
                                                />
                                            </>
                                        )}
                                    </Card.Content>
                                    <Card.Meta textAlign="right">
                                        {!isEditing ? (
                                            <>
                                                <Button color="blue" onClick={() => this.startEditing(item)}>
                                                    Изменить
                                                </Button>
                                                <Button color="red" onClick={() => this.deleteTask(item.id)}>
                                                    {CONSTANTS.DELETE_BUTTON}
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button color="green" onClick={this.saveTaskChanges}>
                                                    Сохранить
                                                </Button>
                                                <Button color="grey" onClick={() => this.setState({ editingTaskId: null })}>
                                                    Отмена
                                                </Button>
                                            </>
                                        )}
                                    </Card.Meta>
                                </Card>
                            );
                        })}
                    </Card.Group>
                ) : (
                    <div style={{ marginTop: "20px", textAlign: "center" }}>
                        <p>{CONSTANTS.EMPTY_TASK_LIST}</p>
                    </div>
                )}
            </div>
        );
    }
}

export default ToDoList;



