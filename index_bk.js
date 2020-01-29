const storageKey = "knnClassifier";

let net;
let labels = [];
let models = {};

const classifier = loadClassifierFromLocalStorage();
const webcamElement = document.getElementById('webcam');

async function toDatasetObject(dataset) {
	const result = await Promise.all(
		Object.entries(dataset).map(async ([classId, value], index) => {
			const data = await value.data();
			return {
				classId: Number(classId),
				// classId: classId,
				data: Array.from(data),
				shape: value.shape
			};
		})
	);
	// console.log('toDatasetObject:', result);
	return result;
};

function fromDatasetObject(datasetObject) {
	return Object.entries(datasetObject).reduce((result, [indexString, { data, shape }]) => {
		const tensor = tf.tensor2d(data, shape);
		const index = Number(indexString);

		result[index] = tensor;
		// console.log('fromDatasetObject:', result);
		return result;
	}, {});

}

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

		// let labels_arr = Object.entries(labels);
		// label_name = labels_arr[classId][0];
		// label_name = labels_arr[classId][0];
		classifier.addExample(activation, classId);
		label_count = classifier.getClassExampleCount()[classId];
		// console.log(label_count);

		// labels[classId] = {
		// 	name: label_name,
		// 	count: label_count
		// };
		// labels[label_name] = {
		// 	classIndex: classId,
		// 	count: label_count
		// };
		labels.forEach((value, index) => {
			// console.log('value', value.name);
			// console.log('index', index);
			if (value.name === label_name) {
				labels[index].classIndex = classId;
				labels[index].count = label_count;
			}
		});
		console.log('labels', labels);

		// Update current model
		updateClassifierInLocalStorage(event, classifier);

		// Object.entries(labels).forEach((value, index)=> {
		// 	if (value[0] === classId) {
		// 		console.log(value[0], index);
		// 		label_name = value[0];
		// 		label_count = classifier.getClassExampleCount(label_name)[classId];
		// 		console.log(label_name, label_count);
		// 		classifier.addExample(activation, index);
		// 	}
		// });

		// Update label count
		let labels_container = document.getElementById('labels_container');


		labels_container.children[classId].innerHTML =
			`${label_name} (${label_count}) <i class="close material-icons" style="
		padding: 0 0 0 10;color: black;" onclick="deleteLabel(event)">close</i>`

		// const dataset = classifier.getClassifierDataset();
		// const datasetOjb = await toDatasetObject(dataset);

		// console.log('datasetOjb:', datasetOjb);
		// console.log(classifier.getClassExampleCount(classId)[classId]);
		// Dispose the tensor to release the memory.
		img.dispose();
	};


	// Clear all labels from current model
	document.getElementById('clearall').addEventListener('click', async () => clearAll(classifier));

	// save model
	document.getElementById('saveModel').addEventListener('click', (event) => saveClassifierInLocalStorage(event, classifier));

	// label button click listener
	document.getElementById('labels_container').addEventListener('click', (event) => {
		if (event.target.classList.contains('btn')) {
			let index;
			let id = event.target.id;
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

	document.getElementById('add_label_form').addEventListener('submit', (event) => addLabelBtnClick(event));
	document.getElementById('add_label_btn').addEventListener('click', (event) => addLabelBtnClick(event));

	document.getElementById('clearsaveddata').addEventListener('click', (event) => clearSavedData(event));

	while (true) {
		if (classifier.getNumClasses() > 0) {
			const img = await webcam.capture();
			// Get the activation from mobilenet from the webcam.
			const activation = net.infer(img, 'conv_preds');
			// Get the most likely class and confidences from the classifier module.
			const result = await classifier.predictClass(activation);
			let predictionTxt = '';

			// console.log(classifier.getClassExampleCount());
			if (result.label !== undefined) {

				labels.forEach((value, index) => {
					// console.log(value.classIndex, Number(result.label));
					if (value.classIndex === Number(result.label)) {
						// classifier.clearClass(labels[index].classIndex);
						// labels.splice(index, 1);
						predictionTxt = `
						<strong>${[value.name] || ''}</strong>
						<div id="add_label_btn" class="btn btn-small blue-grey darken-3">${result.confidences[result.label].toFixed(2)}</div>
						`
						// updateClassifierInLocalStorage(event, classifier)
					}
				});

				// console.log(result);
				
			}

			document.getElementById('console').innerHTML = predictionTxt;
			// Dispose the tensor to release the memory.
			img.dispose();
		}

		await tf.nextFrame();
	}
}

function addLabelBtnClick(event) {
	event.preventDefault();
	let label_name = document.getElementById('label_name').value;
	let label_count = 0;

	if (label_name) {
		let label = {
			name: label_name,
			count: label_count
		};
		labels.push(label);
		renderLabel([label_name, label_count]);
		document.getElementById('label_name').value = '';
		document.getElementById('label_name').classList.remove('valid');
	}
}

function renderLabel(label) {

	let labels_container = document.getElementById('labels_container');

	labels_container.innerHTML += `<button class="btn btn-small waves-effect waves-light blue-grey darken-1" id=${label.name} style="
    display: inline-flex;">${label.name} (${label.count})<i class="close material-icons" style="
    padding: 0 0 0 10;color: black;" onclick="deleteLabel(event)">close</i>`;

}

function deleteLabel(event) {
	let id = event.target.parentElement.id;
	let labels_container = event.target.parentElement.parentElement;
	let label = event.target.parentElement;
	labels_container.removeChild(label);

	labels.forEach((value, index) => {
		if (value.name === id) {
			classifier.clearClass(labels[index].classIndex);
			labels.splice(index, 1);

			updateClassifierInLocalStorage(event, classifier)
		}
	});
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

async function saveClassifierInLocalStorage(event, classifier) {

	event.preventDefault();
	let model_name = document.getElementById('model_name').value;

	if (model_name) {
		console.log('saving...' + model_name);
		const dataset = classifier.getClassifierDataset();
		const datasetOjb = await toDatasetObject(dataset);

		console.log(classifier.getClassExampleCount(), models);

		let model_data = {
			name: model_name,
			// labels: classifier.getClassExampleCount(),
			labels: labels,
			model: datasetOjb
		}

		models[model_name] = model_data;
		models.current = model_name;

		console.log('models:', models);
		const jsonStr = JSON.stringify(models);
		let res = localStorage.setItem(storageKey, jsonStr);
		console.log('res', res);
	} else {
		console.log('model name cannot be empty');
	}
}

async function updateClassifierInLocalStorage(event, classifier) {
	event.preventDefault();
	let model_name = models.current;

	if (model_name) {
		console.log('updating...' + model_name);
		const dataset = classifier.getClassifierDataset();
		const datasetOjb = await toDatasetObject(dataset);
	
		console.log(classifier.getClassExampleCount(), models);
	
		let model_data = {
			name: model_name,
			// labels: classifier.getClassExampleCount(),
			labels: labels,
			model: datasetOjb
		}
	
		models[model_name] = model_data;
		models.current = model_name;
	
		console.log('models:', models);
		const jsonStr = JSON.stringify(models);
		localStorage.setItem(storageKey, jsonStr);
	} else {
		console.log('no model  name to update');
	}
}

function loadClassifierFromLocalStorage() {
	console.log('loading...');
	const classifier = new knnClassifier.KNNClassifier();

	let saved_data = localStorage.getItem(storageKey);
	// console.log(saved_data);

	if (saved_data) {
		saved_data = JSON.parse(saved_data);
	
		models = saved_data ? saved_data : {};
		console.log(models);

		if (models && models.current) {
			loadModel(classifier, models.current);
		}
	}
	return classifier;
}

function loadModel(classifier, model_name) {
	console.log('loading ', model_name);

	// get model
	const dataset = fromDatasetObject(models[model_name].model);
	// update classifier
	classifier.setClassifierDataset(dataset);
	// update labels
	labels = models[model_name].labels;
	

	// render labels
	document.getElementById('labels_container').innerHTML = '';
	labels.forEach((value, index) => {
		renderLabel(value);
	});

	// update current model name
	models.current = model_name;
	// update models on local storage
	const jsonStr = JSON.stringify(models);
	localStorage.setItem(storageKey, jsonStr);
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