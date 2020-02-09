# Tensorflowjs KNN Classifier

A simple tensorflowjs KNN Image Classifier that lets you save/ load your trained models. Add multiple custom labels. Download the model to save state.

Upload the model to restore state.

You can download the repo and open `index.html` to get started or go to this page [tracker](https://is.gd/classifier).

All changes are saved to local storage. but as local storage is limited, you mght soon run out of space. In that case you can download the model as a JSON file. Upload it to restore state.

## Usage
- Add custom labels depending on the category you want to track.
- Click on the corresponding label to train your model. It will add an example to your `classifier` with the label
- The panel under the webcam feed shows the prediction label and confidence percentage. Add multiple examples to get 100% confidence.

## Log data
Use Standard Library to deploy a Google Sheets Connector. With this you can use Gllide App to log and track your data. 