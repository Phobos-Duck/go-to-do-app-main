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
            selectedSourceLanguage: "en",
            selectedTargetLanguage: "en",
            languages: [
                { key: "en", text: "English", value: "en" },
                { key: "de", text: "German", value: "de" },
                { key: "kk", text: "Kazakh", value: "kk" },
                { key: "ru", text: "Russian", value: "ru" },
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
                            key: worker.id,
                            text: worker.name,
                            value: worker.id,
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
                    this.setState({ error: "Failed to add task. Please check input." });
                });
        } else {
            this.setState({ error: "Please fill all required fields." });
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
                alert("Tasks translated successfully!");
            })
            .catch((error) => {
                console.error("Error translating tasks:", error);
                this.setState({ error: "Failed to translate tasks." });
            });
    };

    render() {
        const { workers, items, error, languages, selectedSourceLanguage, selectedTargetLanguage } = this.state;

        return (
            <div>
                <Header as="h2" className="header">
                    {CONSTANTS.HEADER_TEXT}
                </Header>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginBottom: "10px" }}>
                    <Dropdown
                        placeholder="Source Language"
                        fluid
                        selection
                        options={languages}
                        value={selectedSourceLanguage}
                        onChange={(e, { value }) => this.setState({ selectedSourceLanguage: value })}
                    />
                    <Dropdown
                        placeholder="Target Language"
                        fluid
                        selection
                        options={languages}
                        value={selectedTargetLanguage}
                        onChange={(e, { value }) => this.setState({ selectedTargetLanguage: value })}
                    />
                    <Button onClick={this.translateTasks} color="blue">
                        Translate Tasks
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
                        options={workers}
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
                            let color = item.status ? "green" : "yellow";
                            let style = { wordWrap: "break-word" };
                            if (item.status) style["textDecorationLine"] = "line-through";

                            return (
                                <Card key={item.id} color={color} fluid>
                                    <Card.Content>
                                        <Card.Header textAlign="left">{item.text_task}</Card.Header>
                                        <Card.Meta textAlign="left">
                                            {`Worker: ${item.worker_id}, Deadline: ${item.time}`}
                                        </Card.Meta>
                                        <Card.Description>{item.comment}</Card.Description>
                                        <Card.Meta textAlign="right">
                                            {!item.status ? (
                                                <Button color="green" onClick={() => this.markComplete(item.id)}>
                                                    {CONSTANTS.COMPLETE_BUTTON}
                                                </Button>
                                            ) : (
                                                <Button color="yellow" onClick={() => this.undoTask(item.id)}>
                                                    {CONSTANTS.UNDO_BUTTON}
                                                </Button>
                                            )}
                                            <Button color="red" onClick={() => this.deleteTask(item.id)}>
                                                {CONSTANTS.DELETE_BUTTON}
                                            </Button>
                                        </Card.Meta>
                                    </Card.Content>
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


