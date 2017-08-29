// The code written in BSD/KNF indent style
"use strict";

class Array2D extends Array {
	constructor(W, H) {
		if (typeof W !== "undefined" && typeof H !== "undefined") {
			super(W * H);
			this.width = W;
			this.height = H;
			this.size = W * H;
			for (let n = 0; n < this.size; n++) {
				this[n] = 0;
			}
		} else {
			super();
			this.width = 0;
			this.height = 0;
			this.size = 0;
		}
	}

	get(x, y)
	{
		if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
			return null;
		}
		return this[this.width * y + x];
	}

	set(x, y, value)
	{
		if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
			return null;
		}
		this[this.width * y + x] = value;
	}

	/* Bilinear interpolation
	 *
	 * If each data in array is object then select the interpolating data
	 * with setting the appropriate getter function
	 */
	bilinear(x, y, getter = null)
	{
		if (x < 0 || this.width <= x || y < 0 || this.height <= y) {
			return null;
		}
		let x_f = Math.floor(x);
		let y_f = Math.floor(y);
		if (x_f >= this.width - 1) {
			x_f = this.width - 1 - Number.EPSILON;
		}
		if (y_f >= this.height - 1) {
			y_f = this.height - 1 - Number.EPSILON;
		}
		if (getter == null) {
			getter = function (z) { return z; };
		}
		let f0 = getter(this[this.width * y_f + x_f]);
		let f1 = getter(this[this.width * y_f + (x_f + 1)]);
		let f2 = getter(this[this.width * (y_f + 1) + x_f]);
		let f3 = getter(this[this.width * (y_f + 1) + (x_f + 1)]);
		return (f0 + (f1 - f0) * (x - x_f)) * (1 - y + y_f) +
		    (f2 + (f3 - f2) * (x - x_f)) * (y - y_f);
	}
}

class HopfieldNetwork {
	constructor(windowSystemRoot, rootWindow) {
		this.SysRoot = windowSystemRoot;
		this.rootWindow = rootWindow;
		this.rootWindow.style.overflow = "hidden";
		this.rootWindow.rootInstance = this;
		this.rootWindowStyle = window.getComputedStyle(this.rootWindow);

		this.trainButton = null;
		this.startButton = null;
		this.timeCounter = null;
		this.timeCounterLabel = null;
		this.cellsRow = null;
		this.cellsRowLabel = null;
		this.cellsCol = null;
		this.cellsColLabel = null;

		this.trainedPatterns = null;

		this.timeSimulation = 0;
		this.fieldSize = {rows: 5, cols: 5};
		this.field = null;
		this.nodes = null;
		this.weight = null;
		this.running = false;

		this.fieldCellSize = 32;
		this.fieldCellOffset = {top: 120, left: 70};
		// Initialize
		this.init();
	}

	// ----- Initialize -----
	init()
	{
		// Create UI parts
		this.prepareTools();

		// Initialize
		this.initField();
		this.initNetwork();
	}

	prepareTools()
	{
		this.trainButton = document.createElement("div");
		this.trainButton.rootInstance = this;
		this.trainButton.innerHTML = "train";
		this.trainButton.id = "HopfieldNetworkTrainButton";
		this.trainButton.addEventListener("mousedown", function (e) { e.preventDefault(); e.currentTarget.rootInstance.train(e); }, false);
		this.trainButton.addEventListener("touchstart", function (e) { e.preventDefault(); e.currentTarget.rootInstance.train(e); }, false);
		this.rootWindow.appendChild(this.trainButton);

		this.startButton = document.createElement("div");
		this.startButton.rootInstance = this;
		this.startButton.innerHTML = "run";
		this.startButton.id = "HopfieldNetworkStartButton";
		this.startButton.addEventListener("mousedown", function (e) { e.preventDefault(); e.currentTarget.rootInstance.run(e); }, false);
		this.startButton.addEventListener("touchstart", function (e) { e.preventDefault(); e.currentTarget.rootInstance.run(e); }, false);
		this.rootWindow.appendChild(this.startButton);

		this.timeCounter = document.createElement("div");
		this.timeCounter.innerHTML = "0";
		this.timeCounter.id = "HopfieldNetworkTimeCounter";
		this.rootWindow.appendChild(this.timeCounter);

		this.timeCounterLabel = document.createElement("div");
		this.timeCounterLabel.innerHTML = "time";
		this.timeCounterLabel.id = "HopfieldNetworkTimeCounterLabel";
		this.rootWindow.appendChild(this.timeCounterLabel);

		this.cellsRow = document.createElement("input");
		this.cellsRow.rootInstance = this;
		this.cellsRow.type = "text";
		this.cellsRow.value = this.fieldSize.rows;
		this.cellsRow.id = "HopfieldNetworkCellsRow";
		this.cellsRow.addEventListener("change", function (e) { e.currentTarget.rootInstance.reinit(); }, false);
		this.rootWindow.appendChild(this.cellsRow);

		this.cellsCol = document.createElement("input");
		this.cellsCol.rootInstance = this;
		this.cellsCol.type = "text";
		this.cellsCol.value = this.fieldSize.cols;
		this.cellsCol.id = "HopfieldNetworkCellsCol";
		this.cellsCol.addEventListener("change", function (e) { e.currentTarget.rootInstance.reinit(); }, false);
		this.rootWindow.appendChild(this.cellsCol);

		this.timeRowLabel = document.createElement("div");
		this.timeRowLabel.innerHTML = "Rows";
		this.timeRowLabel.id = "HopfieldNetworkCellsRowLabel";
		this.rootWindow.appendChild(this.timeRowLabel);

		this.timeColLabel = document.createElement("div");
		this.timeColLabel.innerHTML = "x Cols";
		this.timeColLabel.id = "HopfieldNetworkCellsColLabel";
		this.rootWindow.appendChild(this.timeColLabel);

		this.trainedPattern = document.createElement("div");
		this.trainedPattern.id = "HopfieldNetworkTrainedPattern";
		this.trainedPattern.style.width = "1px";
		this.trainedPattern.style.height = "1px";
		this.rootWindow.appendChild(this.trainedPattern);
	}

	initField()
	{
		this.field = new Array2D(this.fieldSize.cols, this.fieldSize.rows);
		let size = this.fieldCellSize;
		for (let y = 0; y < this.field.height; y++) {
			for (let x = 0; x < this.field.width; x++) {
				let check = document.createElement("input");
				check.type = "checkbox";
				check.className = "HopfieldNetworkPixel";
				check.style.top = (this.fieldCellOffset.top + y * (size + 2)) + "px";
				check.style.left = (this.fieldCellOffset.left + x * (size + 2)) + "px";
				check.style.width = size + "px";
				check.style.height = size + "px";
				this.field.set(x, y, check);
				this.rootWindow.appendChild(this.field.get(x, y));
			}
		}
	}

	initNetwork()
	{
		// node
		this.nodes = new Array(this.field.length);
		for (let n = 0; n < this.nodes.length; n++) {
			this.nodes[n] = {output: 0, bias: 0};
		}
		// weight
		this.weight = new Array2D(this.nodes.length, this.nodes.length);
		for (let n = 0; n < this.weight.length; n++) {
			this.weight[n] = 0;
		}
	}

	reinit()
	{
		this.fieldSize.rows = this.cellsRow.value;
		if (this.fieldSize.rows < 1) {
			this.fieldSize.rows = 1;
		}
		this.fieldSize.cols = this.cellsCol.value;
		if (this.fieldSize.cols < 1) {
			this.fieldSize.cols = 1;
		}
		for (let n = 0; n < this.field.length; n++) {
			this.field[n].remove();
		}
		this.initField();
		this.initNetwork();
	}




	// ----- SIMULATION -----
	start()
	{
	}




	// ----- FIELD -----
	setField()
	{
		for (let n = 0; n < this.nodes.length; n++) {
			this.field[n].checked = this.nodes[n].output > 0 ? true : false;
		}
	}




	// ----- NETWORKS -----
	train()
	{
		// get field input
		let nodeNum = this.nodes.length;
		let current = new Array2D(this.field.width, this.field.height);
		for (let n = 0; n < this.field.length; n++) {
			current[n] = this.field[n].checked ? 1 : -1;
		}
		for (let i = 0; i < nodeNum; i++) {
			for (let j = 0; j < nodeNum; j++) {
				if (i != j) {
					let tmp = this.weight.get(j, i) + current[i] * current[j];
					this.weight.set(j, i, tmp);
				}
			}
		}
		// Add trained pattern to the list
		this.addTrainedPattern(current);
	}

	addTrainedPattern(pattern)
	{
		let cellSize = 8;
		var newPattern = document.createElement("div");
		newPattern.rootInstance = this;
		newPattern.style.position = "absolute";
		newPattern.style.top = 10 + this.trainedPattern.children.length * ((cellSize + 1) * this.field.height + 10) + "px";
		newPattern.style.right = (cellSize + 1) * this.field.width - 1 + 10 + "px";
		newPattern.pattern = [];
		for (let i = 0; i < this.field.length; i++) {
			newPattern.pattern[i] = pattern[i] > 0 ? true : false;
		}
		for (let m = 0; m < this.field.height; m++) {
			for (let n = 0; n < this.field.width; n++) {
				var cell = document.createElement("div");
				cell.style.position = "absolute";
				cell.style.top = m * (cellSize + 1) + "px";
				cell.style.left = n * (cellSize + 1) + "px";
				cell.style.width = cellSize + "px";
				cell.style.height = cellSize + "px";
				cell.style.outline = "1px solid rgb(255,255,255)";
				cell.style.backgroundColor = pattern.get(n, m) > 0 ? "rgb(255,255,255)" : "rgb(0,0,0)";
				newPattern.appendChild(cell);
			}
		}
		this.trainedPattern.appendChild(newPattern);
		let setPattern = function (event) {
			let root = event.currentTarget.rootInstance;
			for (let n = 0; n < root.field.length; n++) {
				root.field[n].checked = event.currentTarget.pattern[n];
			}
		};
		newPattern.addEventListener("click", setPattern, false);
		newPattern.addEventListener("touchstart", setPattern, false);

		// Set trainedPattern's size
		let currentWidth = parseInt(this.trainedPattern.style.width, 10);
		let newWidth = 20 + (cellSize + 1) * this.field.width;
		if (newWidth > currentWidth) {
			this.trainedPattern.style.width = newWidth + "px";
		}
		this.trainedPattern.style.height = 10 + this.trainedPattern.children.length * ((cellSize + 1) * this.field.height + 10) + "px";
	}

	run()
	{
		if (!this.running) {
			this.running = true;
			let root = this;
			let count = 100;
			this.loopTimer = setInterval(function () {
				root.step();
				count--;
				if (count <= 0) {
					clearInterval(root.loopTimer);
					root.running = false;
				}
			}, 20);
		}
	}

	step()
	{
		// Get current field state
		for (let k = 0; k < this.field.length; k++) {
			this.nodes[k].output = this.field[k].checked ? 1 : -1;
		}
		// Update hopfield network
		let nodeNum = this.nodes.length;
		let i = Math.floor(Math.random() * nodeNum);
		for (let k = 0; k < this.field.length; k++) {
			this.field[k].style.outlineColor = "rgb(255,255,255)";
		}
		this.field[i].style.outlineColor = "rgb(255,0,0)";
		let sum = this.nodes[i].bias;
		for (let j = 0; j < nodeNum; j++) {
			sum += this.weight.get(j, i) * this.nodes[j].output;
		}
		let old = this.nodes[i].output;
		if (sum > 0) {
			this.nodes[i].output = 1;
			this.field[i].checked = true;
		} else {
			this.nodes[i].output = -1;
			this.field[i].checked = false;
		}
		this.timeSimulation++;
		this.timeCounter.innerHTML = this.timeSimulation;
	}
}

