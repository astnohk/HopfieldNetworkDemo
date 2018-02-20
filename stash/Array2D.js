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

