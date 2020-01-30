const storageKey = "knnClassifier";

let net;
let labels = [];
let models = [];
let modelDB = {};

class Model {
	constructor(name, labels, dataObj) {
		this.name = name;
		// this.labels = labels;
		this.labels = this.updateLabels(labels);
		this.model = dataObj;
	}
	add() {
		models.push(this);
		return this;
	}
	updateLabels(labelsArr) {
		let labels = labelsArr.map(label => {
			return new Label(label.name, label.count, label.id)
		})
		return labels;
	}
	update(labelsArr, updatedModelData) {
		console.log(labelsArr);
		this.labels = labelsArr;
		this.model = updatedModelData;
		return this;
	}
	delete() {
		// delete from models array
		models = models.filter(model => {
			return this.name != model.name;
		})
		return this;
	}
}

class Label {
	constructor(name, count, id) {
		this.name = name;
		this.count = count;
		this.id = id;
	}

	add() {
		labels.push(this);
		return this;
	}

	delete() {
		// delete from labels array
		labels = labels.filter(label => {
			return this.name != label.name;
		})
		return this;
	}

	updateId(id) {
		this.id = id;
		return this;
	}

	updateCount(count) {
		this.count = count;
		return this;
	}

	render() {
		console.log(this.name);
		let labels_container = document.getElementById('labels_container');

		labels_container.innerHTML += `<button class="btn btn-small waves-effect waves-light blue-grey darken-1" id=${this.name} style="display: inline-flex;">${this.name} (${this.count})<i class="close material-icons" style="padding: 0 0 0 10;color: black;" onclick="deleteLabel(event, ${this.name})">close</i>`;
		return this;
	}
}

async function toDatasetObject(dataset) {
	const result = await Promise.all(
		Object.entries(dataset).map(async ([classId, value], index) => {
			const data = await value.data();
			return {
				// classId: Number(classId),
				classId: classId,
				data: Array.from(data),
				shape: value.shape
			};
		})
	);
	// console.log('toDatasetObject:', result);
	return result;
};

function fromDatasetObject(datasetObject) {
	console.log('datasetObject:', datasetObject);
	let test = Object.entries(datasetObject).reduce((result, [indexString, { data, shape }]) => {
		const tensor = tf.tensor2d(data, shape);
		const index = Number(indexString);

		let label = datasetObject[indexString].classId;
		result[label] = tensor;
		// result[indexString] = tensor;
		console.log('result:', result);
		return result;
	}, {});
	console.log('test:', test)
	return test;
}

const classifier = loadClassifierFromLocalStorage();
const webcamElement = document.getElementById('webcam');

async function app() {
	// Load the model.
	net = await mobilenet.load();
	console.log('Successfully loaded mobilenet');
	const webcam = await tf.data.webcam(webcamElement);
	document.getElementById('preloader').classList.add('hide');
	console.log('Successfully loaded video');

	let label_count = 0;

	const addExample = async (classId, label_name) => {
		console.log('classId: ', classId);
		const img = await webcam.capture();
		const activation = net.infer(img, 'conv_preds');

		let res = classifier.addExample(activation, label_name);

		label_count = classifier.getClassExampleCount()[label_name];
		console.log('label_count', label_count);

		let [label] = labels.filter(l => {
			return l.name === label_name;
		})

		label.updateCount(label_count)
			.updateId(classId);

		console.log('add exampe label:', label);
		console.log('labels', labels);

		// Update current model
		updateModel();
		// updateClassifierInLocalStorage(event, classifier);

		// Update label count
		let labels_container = document.getElementById('labels_container');

		labels_container.children[classId].innerHTML =
			`${label_name} (${label_count}) <i class="close material-icons" style="padding: 0 0 0 10;color: black;" onclick="deleteLabel(event)">close</i>`

		// Dispose the tensor to release the memory.
		img.dispose();
	};


	// Clear all labels from current model
	document.getElementById('clearall').addEventListener('click', async () => clearAll(classifier));

	// save model
	document.getElementById('saveModel').addEventListener('click', (event) => saveNewModel(event));

	// load a saved model
	document.getElementById('models_list').addEventListener('change', async function (event) {
		console.log('e:', event.target.value);
		getEl('labels_container').innerHTML = '';
		await loadModel(event.target.value, classifier);
	});

	// label button click listener
	document.getElementById('labels_container').addEventListener('click', (event) => {
		if (event.target.classList.contains('btn')) {
			let index;
			let id = event.target.id;

			console.log(classifier.getClassExampleCount());
			// get index of the label
			// console.log('Labels', labels);
			labels.forEach((value, index) => {
				// console.log('value', value.name);
				// console.log('index', index);
				if (value.name === id) {
					addExample(index, id);
				}
			});
		}
	});

	// document.getElementById('getModel').addEventListener('click', (e) => loadClassifierFromLocalStorage());

	document.getElementById('add_label_form').addEventListener('submit', (event) => addNewLabel(event));
	document.getElementById('add_label_btn').addEventListener('click', (event) => addNewLabel(event));

	document.getElementById('clearsaveddata').addEventListener('click', (event) => clearSavedData(event));

	try {
		while (true) {
			if (classifier.getNumClasses() > 0) {
				const img = await webcam.capture();
				// Get the activation from mobilenet from the webcam.
				const activation = net.infer(img, 'conv_preds');
				// Get the most likely class and confidences from the classifier module.
				const result = await classifier.predictClass(activation);
				let predictionTxt = '';

				if (Date.now() % 100 === 0) {
					console.log(result);
				}
				// console.log(classifier.getClassExampleCount());
				if (result.label !== undefined) {

					let [label] = labels.filter(l => {
						return l.name == result.label;
					})

					let label_name = label ? label.name : '';
					let confidence = result.confidences[result.label];

					predictionTxt = `
							<strong>${label_name}</strong>
							<div id="add_label_btn" class="btn btn-small blue-grey darken-3">${confidence.toFixed(2)}</div>
							`
				}

				document.getElementById('console').innerHTML = predictionTxt;
				// Dispose the tensor to release the memory.
				img.dispose();
			}

			await tf.nextFrame();
		}
	} catch (err) {
		console.log(err);
	}

}



function addNewLabel(event) {
	event.preventDefault();
	let label_name = getEl('label_name').value;
	let label = new Label(label_name, 0, '');
	label.add().render();

	getEl('label_name').value = '';
	getEl('label_name').classList.remove('valid');
}

async function saveNewModel(event) {
	event.preventDefault();
	const dataset = classifier.getClassifierDataset();
	const datasetOjb = await toDatasetObject(dataset);

	let model = new Model(getEl('model_name').value, labels, datasetOjb);
	model.add();

	modelDB.current = model.name;
	modelDB.models = models;

	console.log(modelDB);
	saveClassifierInLocalStorage(modelDB);
}

async function updateModel() {
	// event.preventDefault();
	if (modelDB.current) {
		console.log('before:', modelDB);
		const dataset = classifier.getClassifierDataset();
		const datasetOjb = await toDatasetObject(dataset);

		let [model] = models.filter(m => {
			return m.name === modelDB.current;
		})

		console.log('datasetOjb:', datasetOjb, model);
		model.update(labels, datasetOjb);

		modelDB.models = models;
		saveClassifierInLocalStorage(modelDB);
		console.log('after:', modelDB);
	} else {
		console.log('no models saved:', modelDB);
	}
}

function renderLabel(label) {

	let labels_container = document.getElementById('labels_container');

	labels_container.innerHTML += `<button class="btn btn-small waves-effect waves-light blue-grey darken-1" id=${label.name} style="
    display: inline-flex;">${label.name} (${label.count})<i class="close material-icons" style="
    padding: 0 0 0 10;color: black;" onclick="deleteLabel(event)">close</i>`;

}

function deleteLabel(event) {

	let name = event.target.parentElement.id;
	let [label] = labels.filter(l => {
		return l.name === name;
	})

	console.log('deleting: ', label.id, name);

	if (label.count > 0) {
		classifier.clearClass(name);
	}
	// if (label.id !== undefined) {
	// 	console.log('clearing: ', label.id);
	// 	classifier.clearClass(label.id);
	// } else {
	// 	console.log('else: ', label.id);
	// }

	label.delete();
	let labels_container = event.target.parentElement.parentElement;
	labels_container.removeChild(getEl(name));

	// updateClassifierInLocalStorage(event, classifier);
	updateModel();
}

async function clearAll(classifier) {
	classifier.clearAllClasses();
}

async function clearSavedData(event) {
	event.preventDefault();
	const jsonStr = JSON.stringify({});
	console.log('data cleared');
	localStorage.setItem(storageKey, jsonStr);
}

async function saveClassifierInLocalStorage(dataToSave) {
	const jsonStr = JSON.stringify(dataToSave);
	localStorage.setItem(storageKey, jsonStr);
}

// async function updateClassifierInLocalStorage(event, classifier) {
// 	event.preventDefault();
// 	let model_name = models.current;

// 	if (model_name) {
// 		console.log('updating...' + model_name);
// 		const dataset = classifier.getClassifierDataset();
// 		const datasetOjb = await toDatasetObject(dataset);

// 		let model_data = {
// 			name: model_name,
// 			// labels: classifier.getClassExampleCount(),
// 			labels: labels,
// 			model: datasetOjb
// 		}

// 		models[model_name] = model_data;
// 		models.current = model_name;

// 		console.log('updated models:', models);
// 		const jsonStr = JSON.stringify(models);
// 		localStorage.setItem(storageKey, jsonStr);
// 	} else {
// 		console.log('no model  name to update');
// 	}
// }

function loadClassifierFromLocalStorage() {

	const classifier = new knnClassifier.KNNClassifier();

	let saved_data = localStorage.getItem(storageKey);
	saved_data = JSON.parse(saved_data);
	console.log(saved_data);

	if (saved_data && saved_data.models) {

		saved_data.models.forEach(data => {
			let model = new Model(data.name, data.labels, data.model);
			model.add();

			if (models && saved_data.current && saved_data.current === model.name) {
				console.log('loading model - ', model.name)
				modelDB.current = saved_data.current;
				loadModel(saved_data.current, classifier);
			}
		})

		modelDB.models = models;
		console.log('modelDB: Updated - ', modelDB);
	}
	return classifier;
}

function loadModel(model_name, classifier) {

	try {


		labels = [];

		let [model] = models.filter(m => {
			return m.name === model_name;
		})

		// if (!classifier) {
		// 	console.log('no classifier');
		// 	classifier = new knnClassifier.KNNClassifier();
		// }

		console.log('loading ', model_name, model);
		// get model
		const dataset = fromDatasetObject(model.model);
		// update classifier
		classifier.setClassifierDataset(dataset);

		model.labels.forEach(label => {
			// let label = new Label(l.name, l.count, l.id);
			label.add().render();
		});

		console.log('loaded model', model);
		console.log('loaded labels', labels);
		// update current model name
		modelDB.current = model_name;

	} catch (error) {
		console.log('error: ', error);
	}
}

function getEl(elementId) {
	return document.getElementById(elementId);
}

// function loadClassifierFromLocalStorage() {
// 	console.log('loading...');
// 	const classifier = new knnClassifier.KNNClassifier();
// 	const datasetJson = localStorage.getItem(storageKey);
// 	if (datasetJson) {
// 		const datasetObj = JSON.parse(datasetJson);
// 		const dataset = fromDatasetObject(datasetObj);
// 		console.log('dataset:', dataset);
// 		classifier.setClassifierDataset(dataset);
// 		let labelcount = classifier.getClassExampleCount();
// 		console.log(labelcount);
// 	}
// 	return classifier;
// }



app();