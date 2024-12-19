var AT_VP6_Decoder = (function() {
	function validate(isH) {
		if (!isH) throw new Error("ValidationError");
	}
	const asU8 = function(num) {
		return (num << 24) >>> 24;
	}
	const asU32 = function(num) {
		return num >>> 0;
	}
	const asI32 = function(num) {
		return num | 0;
	}
	const asI16 = function(num) {
		return (num << 16) >> 16;
	}
	const asU16 = function(num) {
		return (num << 16) >>> 16;
	}
	const wrapping_mul_i16 = function(a, b) {
		return asI16(a * b);
	}
	class Bits {
		constructor(src) {
			this.src = src;
			this.bytePos = 0;
			this.bitPos = 0;
		}
		read(n) {
			var value = 0;
			while (n--) (value <<= 1), (value |= this.readBit());
			return value;
		}
		readBit() {
			var val = (this.src[this.bytePos] >> (7 - this.bitPos++)) & 0x1;
			if (this.bitPos > 7) {
				this.bytePos++;
				this.bitPos = 0;
			}
			return val;
		}
		read_bool() {
			return !!this.readBit();
		}
		tell() {
			return (this.bytePos * 8) + this.bitPos;
		}
	}
	function edge_emu(src, xpos, ypos, bw, bh, dst, dstride, comp, align) {
		let stride = src.get_stride(comp);
		let offs   = src.get_offset(comp);
		let [w_, h_] = src.get_dimensions(comp);
		let [hss, vss] = src.get_info().get_format().get_chromaton(comp).get_subsampling();
		let data = src.get_data();
		let framebuf = data;
		let w, h;
		if (align == 0) {
			w = w_;
			h = h_;
		} else {
			let wa = (align > hss) ? (1 << (align - hss)) - 1 : 0;
			let ha = (align > vss) ? (1 << (align - vss)) - 1 : 0;
			w = (w_ + wa) - wa;
			h = (h_ + ha) - ha;
		}
		for (let y = 0; y < bh; y++) {
			let srcy;
			if (y + ypos < 0) {
				srcy = 0;
			} else if ((y) + ypos >= (h)) {
				srcy = h - 1;
			} else {
				srcy = ((y) + ypos);
			}
			for (let x = 0; x < bw; x++) {
				let srcx;
				if ((x) + xpos < 0) {
					srcx = 0;
				} else if ((x) + xpos >= (w)) {
					srcx = w - 1;
				} else {
					srcx = ((x) + xpos);
				}
				dst[x + y * dstride] = framebuf[offs + srcx + srcy * stride];
			}
		}
	}
	class MV {
		constructor(x, y) {
			this.x = asI16(x);
			this.y = asI16(y);
		}
		add(other) {
			return new MV(this.x + other.x, this.y + other.y);
		}
		eq(other) {
			return (this.x == other.x) && (this.y == other.y);
		}
	}
	const ZERO_MV = new MV(0, 0);
	const ZIGZAG = new Uint32Array([0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5, 12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13, 6, 7, 14, 21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23, 30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60, 61, 54, 47, 55, 62, 63]);
	class YUVSubmodel {
		constructor(type) {
			this.type = type;
		}
	}
	YUVSubmodel.YCbCr = 1;
	YUVSubmodel.YIQ = 2;
	YUVSubmodel.YUVJ = 3;
	class ColorModel {
		constructor(type, value) {
			this.type = type;
			this.value = value;
		}
	}
	ColorModel.RGB = 1;
	ColorModel.YUV = 2;
	ColorModel.CMYK = 3;
	ColorModel.HSV = 4;
	ColorModel.LAB = 5;
	ColorModel.XYZ = 6;
	class NAPixelChromaton {
		constructor(data) {
			this.h_ss = data.h_ss;
			this.v_ss = data.v_ss;
			this.packed = data.packed;
			this.depth = data.depth;
			this.shift = data.shift;
			this.comp_offs = data.comp_offs;
			this.next_elem = data.next_elem;
		}
		get_subsampling() {
			return [this.h_ss, this.v_ss]; // self.h_ss, self.v_ss
		}
		is_packed() {
			return this.packed;
		}
		get_depth() {
			return this.depth;
		}
		get_shift() {
			return this.shift;
		}
		get_offset() {
			return this.comp_offs;
		}
		get_step() {
			return this.next_elem;
		}
		get_width(width) {
			return (width + ((1 << this.h_ss) - 1)) >> this.h_ss;
		}
		get_height(height) {
			return (height + ((1 << this.v_ss) - 1)) >> this.v_ss;
		}
		get_linesize(width) {
			let d = this.depth;
			if (this.packed) {
				return (this.get_width(width) * d + d - 1) >> 3;
			} else {
				return this.get_width(width);
			}
		}
		get_data_size() {
			let nh = (height + ((1 << this.v_ss) - 1)) >> this.v_ss;
			return (this.get_linesize(width) * nh);
		}
	}
	class NAPixelFormaton {
		constructor(data) {
			this.model = data.model;
			this.components = data.components;
			this.comp_info = data.comp_info;
			this.elem_size = data.elem_size;
			this.be = data.be;
			this.alpha = data.alpha;
			this.palette = data.palette;
		}
		get_model() {
			return this.model;
		}
		get_num_comp() {
			return this.components;
		}
		get_chromaton(i) {
			return this.comp_info[i];
		}
		is_be() {
			return this.be;
		}
		has_alpha() {
			return this.alpha;
		}
		is_paletted() {
			return this.palette;
		}
		get_elem_size() {
			return this.elem_size;
		}
	}
	const YUV420_FORMAT = new NAPixelFormaton({
		model: new ColorModel(ColorModel.YUV, new YUVSubmodel(YUVSubmodel.YUVJ)),
		components: 3,
		comp_info: [new NAPixelChromaton({ h_ss: 0, v_ss: 0, packed: false, depth: 8, shift: 0, comp_offs: 0, next_elem: 1 }), new NAPixelChromaton({ h_ss: 1, v_ss: 1, packed: false, depth: 8, shift: 0, comp_offs: 1, next_elem: 1 }), new NAPixelChromaton({ h_ss: 1, v_ss: 1, packed: false, depth: 8, shift: 0, comp_offs: 2, next_elem: 1 }), null, null],
		elem_size: 0,
		be: false,
		alpha: false,
		palette: false
	});
	class NAVideoInfo {
		constructor(w, h, flip, fmt) {
			this.width = w;
			this.height = h;
			this.flipped = flip;
			this.format = fmt;
		}
		get_width() {
			return this.width;
		}
		get_height() {
			return this.height;
		}
		is_flipped() {
			return this.flipped;
		}
		get_format() {
			return this.format;
		}
		set_width(w) {
			this.width = w;
		}
		set_height(h) {
			this.height = h;
		}
		eq(other) {
			return this.width == other.width && this.height == other.height && this.flipped == other.flipped;
		}
	}
	function get_plane_size(info, idx) {
		let chromaton = info.get_format().get_chromaton(idx);
		if (chromaton === null) {
			return [0, 0];
		}
		let [hs, vs] = chromaton.get_subsampling();
		let w = (info.get_width() + ((1 << hs) - 1)) >> hs;
		let h = (info.get_height() + ((1 << vs) - 1)) >> vs;
		return [w, h];
	}
	class NAVideoBuffer {
		constructor(data) {
			this.info = data.info;
			this.data = data.data;
			this.offs = data.offs;
			this.strides = data.strides;
		}
		get_num_refs() {
			return 1;
		}
		get_info() {
			return this.info;
		}
		get_data() {
			return this.data;
		}
		get_dimensions(idx) {
			return get_plane_size(this.info, idx);
		}
		get_offset(idx) {
			if (idx >= this.offs.length) {
				return 0;
			} else {
				return this.offs[idx];
			}
		}
		get_stride(idx) {
			if (idx >= this.strides.length) {
				return 0;
			}
			return this.strides[idx];
		}
		cloned() {
			return new NAVideoBuffer({
				info: this.info,
				data: this.data.slice(0),
				offs: this.offs,
				strides: this.strides
			});
		}
	}
	class NABufferType {
		constructor(type, value) {
			this.type = type;
			this.value = value;
		}
		get_vbuf() {
			return this.value;
		}
	}
	NABufferType.Video = 1;
	NABufferType.Video16 = 2;
	NABufferType.Video32 = 3;
	NABufferType.VideoPacked = 4;
	NABufferType.Data = 5;
	NABufferType.None = 6;
	const NA_SIMPLE_VFRAME_COMPONENTS = 4;
	class NASimpleVideoFrame {
		constructor(data) {
			this.width = data.width;
			this.height = data.height;
			this.flip = data.flip;
			this.stride = data.stride;
			this.offset = data.offset;
			this.components = data.components;
			this.data = data.data;
		}
		static from_video_buf(vbuf) {
			let vinfo = vbuf.get_info();
			let components = vinfo.format.components;
			if (components > NA_SIMPLE_VFRAME_COMPONENTS) return null;
			let w = new Uint32Array(NA_SIMPLE_VFRAME_COMPONENTS);
			let h = new Uint32Array(NA_SIMPLE_VFRAME_COMPONENTS);
			let s = new Uint32Array(NA_SIMPLE_VFRAME_COMPONENTS);
			let o = new Uint32Array(NA_SIMPLE_VFRAME_COMPONENTS);
			for (var comp = 0; comp < components; comp++) {
				let [width, height] = vbuf.get_dimensions(comp);
				w[comp] = width;
				h[comp] = height;
				s[comp] = vbuf.get_stride(comp);
				o[comp] = vbuf.get_offset(comp);
			}
			let flip = vinfo.flipped;
			return new NASimpleVideoFrame({
				width: w,
				height: h,
				flip,
				stride: s,
				offset: o,
				components,
				data: vbuf.data,
			});
		}
	}
	function alloc_video_buffer(vinfo, align) {
		let fmt = vinfo.format;
		let new_size = 0;
		let offs = [];
		let strides = [];
		for (var i = 0; i < fmt.get_num_comp(); i++) {
			if (!fmt.get_chromaton(i)) {
				throw new Error("AllocatorError::FormatError");
			}
		}
		let align_mod = (1 << align) - 1;
		let width = (vinfo.width + align_mod) - align_mod;
		let height = (vinfo.height + align_mod) - align_mod;
		let max_depth = 0;
		let all_packed = true;
		for (var i = 0; i < fmt.get_num_comp(); i++) {
			let ochr = fmt.get_chromaton(i);
			if (!ochr) continue;
			let chr = ochr;
			if (!chr.is_packed()) {
				all_packed = false;
			}
			max_depth = Math.max(max_depth, chr.get_depth());
		}
		let unfit_elem_size = false;
		switch(fmt.get_elem_size()) {
			case 2:
			case 4:
				unfit_elem_size = true;
				break;
		}
		unfit_elem_size = !unfit_elem_size;
		if (!all_packed) {
			for (var i = 0; i < fmt.get_num_comp(); i++) {
				let ochr = fmt.get_chromaton(i);
				if (!ochr) continue;
				let chr = ochr;
				offs.push(new_size);
				let stride = chr.get_linesize(width);
				let cur_h = chr.get_height(height);
				let cur_sz = (stride * cur_h);
				let new_sz = (new_size + cur_sz);
				new_size = new_sz;
				strides.push(stride);
			}
			if (max_depth <= 8) {
				let data = new Uint8Array(new_size);
				let buf = new NAVideoBuffer({
					data: data,
					info: vinfo,
					offs,
					strides
				});
				return new NABufferType(NABufferType.Video, buf);
			}
		}
	}
	class NAVideoBufferPool {
		constructor(max_len) {
			this.pool = [];
			this.max_len = max_len;
			this.add_len = 0;
		}
		set_dec_bufs(add_len) {
			this.add_len = add_len;
		}
		reset() {
			this.pool = [];
		}
		prealloc_video(vinfo, align) {
			let nbufs = this.max_len + this.add_len - this.pool.length;
			for (var _ = 0; _ < nbufs; _++) {
				let vbuf = alloc_video_buffer(vinfo, align);
				var buf = vbuf.value;
				this.pool.push(buf);
			}
		}
		get_free() {
			for (var i = 0; i < this.pool.length; i++) {
				var e = this.pool[i];
				if (e.get_num_refs() == 1)
					return e;
			}
			return null;
		}
		get_info() {
			if (this.pool.length) {
				return (this.pool[0].get_info());
			} else {
				return null;
			}
		}
		get_copy(rbuf) {
			let dbuf = this.get_free().cloned();
			dbuf.data.set(rbuf.data, 0);
			return dbuf;
		}
	}
	class NADecoderSupport {
		constructor() {
			this.pool_u8 = new NAVideoBufferPool(0);
		}
	}
	const VERSION_VP60 = 6; // u8
	const VERSION_VP62 = 8; // u8
	const VP6_SIMPLE_PROFILE = 0; // u8
	const VP6_ADVANCED_PROFILE = 3; // u8
	const LONG_VECTOR_ORDER = new Uint32Array([0, 1, 2, 7, 6, 5, 4]); // usize
	const NZ_PROBS = new Uint8Array([162, 164]);
	const RAW_PROBS = [new Uint8Array([247, 210, 135, 68, 138, 220, 239, 246]),new Uint8Array([244, 184, 201, 44, 173, 221, 239, 253])];
	const TREE_PROBS = [new Uint8Array([225, 146, 172, 147, 214,  39, 156]),new Uint8Array([204, 170, 119, 235, 140, 230, 228])];
	const ZERO_RUN_PROBS = [new Uint8Array([198, 197, 196, 146, 198, 204, 169, 142, 130, 136, 149, 149, 191, 249]),new Uint8Array([135, 201, 181, 154,  98, 117, 132, 126, 146, 169, 184, 240, 246, 254])];
	const HAS_NZ_PROB = new Uint8Array([237, 231]);
	const HAS_SIGN_PROB = new Uint8Array([246, 243]);
	const HAS_TREE_PROB = [new Uint8Array([253, 253, 254, 254, 254, 254, 254]), new Uint8Array([245, 253, 254, 254, 254, 254, 254])];
	const HAS_RAW_PROB = [new Uint8Array([254, 254, 254, 254, 254, 250, 250, 252]), new Uint8Array([254, 254, 254, 254, 254, 251, 251, 254])];
	const HAS_COEF_PROBS = [new Uint8Array([146, 255, 181, 207, 232, 243, 238, 251, 244, 250, 249]),new Uint8Array([179, 255, 214, 240, 250, 255, 244, 255, 255, 255, 255])];
	const HAS_SCAN_UPD_PROBS = new Uint8Array([0, 132, 132, 159, 153, 151, 161, 170, 164, 162, 136, 110, 103, 114, 129, 118, 124, 125, 132, 136, 114, 110, 142, 135, 134, 123, 143, 126, 153, 183, 166, 161, 171, 180, 179, 164, 203, 218, 225, 217, 215, 206, 203, 217, 229, 241, 248, 243, 253, 255, 253, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]);
	const HAS_ZERO_RUN_PROBS = [new Uint8Array([219, 246, 238, 249, 232, 239, 249, 255, 248, 253, 239, 244, 241, 248]),new Uint8Array([198, 232, 251, 253, 219, 241, 253, 255, 248, 249, 244, 238, 251, 255])];
	const VP6_AC_PROBS = [[[new Uint8Array([227, 246, 230, 247, 244, 255, 255, 255, 255, 255, 255]),new Uint8Array([255, 255, 209, 231, 231, 249, 249, 253, 255, 255, 255]),new Uint8Array([255, 255, 225, 242, 241, 251, 253, 255, 255, 255, 255]),new Uint8Array([255, 255, 241, 253, 252, 255, 255, 255, 255, 255, 255]),new Uint8Array([255, 255, 248, 255, 255, 255, 255, 255, 255, 255, 255]),new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255])], [new Uint8Array([240, 255, 248, 255, 255, 255, 255, 255, 255, 255, 255]),new Uint8Array([255, 255, 240, 253, 255, 255, 255, 255, 255, 255, 255]),new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]),new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]),new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]),new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255])]], [[new Uint8Array([206, 203, 227, 239, 247, 255, 253, 255, 255, 255, 255]),new Uint8Array([207, 199, 220, 236, 243, 252, 252, 255, 255, 255, 255]),new Uint8Array([212, 219, 230, 243, 244, 253, 252, 255, 255, 255, 255]),new Uint8Array([236, 237, 247, 252, 253, 255, 255, 255, 255, 255, 255]),new Uint8Array([240, 240, 248, 255, 255, 255, 255, 255, 255, 255, 255]),new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255])], [new Uint8Array([230, 233, 249, 255, 255, 255, 255, 255, 255, 255, 255]),new Uint8Array([238, 238, 250, 255, 255, 255, 255, 255, 255, 255, 255]),new Uint8Array([248, 251, 255, 255, 255, 255, 255, 255, 255, 255, 255]),new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]),new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]),new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255])]], [[new Uint8Array([225, 239, 227, 231, 244, 253, 243, 255, 255, 253, 255]),new Uint8Array([232, 234, 224, 228, 242, 249, 242, 252, 251, 251, 255]),new Uint8Array([235, 249, 238, 240, 251, 255, 249, 255, 253, 253, 255]),new Uint8Array([249, 253, 251, 250, 255, 255, 255, 255, 255, 255, 255]),new Uint8Array([251, 250, 249, 255, 255, 255, 255, 255, 255, 255, 255]),new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255])], [new Uint8Array([243, 244, 250, 250, 255, 255, 255, 255, 255, 255, 255]),new Uint8Array([249, 248, 250, 253, 255, 255, 255, 255, 255, 255, 255]),new Uint8Array([253, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]),new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]),new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]),new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255])]]];
	const VP6_DC_WEIGHTS = [[new Int16Array([122, 133]),new Int16Array([133, 51]),new Int16Array([142, -16])], [new Int16Array([0, 1]),new Int16Array([0, 1]),new Int16Array([0, 1])], [new Int16Array([78, 171]),new Int16Array([169, 71]),new Int16Array([221, -30])], [new Int16Array([139, 117]),new Int16Array([214, 44]),new Int16Array([246, -3])], [new Int16Array([168, 79]),new Int16Array([210, 38]),new Int16Array([203, 17])]];
	const VP6_IDX_TO_AC_BAND = new Uint32Array([0, 0, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]);
	const VP6_BICUBIC_COEFFS = [[new Int16Array([0, 128, 0, 0]), new Int16Array([-3, 122, 9, 0]), new Int16Array([-4, 109, 24, -1]), new Int16Array([-5, 91, 45, -3]), new Int16Array([-4, 68, 68, -4]), new Int16Array([-3, 45, 91, -5]), new Int16Array([-1, 24, 109, -4]), new Int16Array([ 0, 9, 122, -3])], [new Int16Array([0, 128, 0, 0]), new Int16Array([-4, 124, 9, -1]), new Int16Array([-5, 110, 25, -2]), new Int16Array([-6, 91, 46, -3]), new Int16Array([-5, 69, 69, -5]), new Int16Array([-3, 46, 91, -6]), new Int16Array([-2, 25, 110, -5]), new Int16Array([-1, 9, 124, -4])], [new Int16Array([0, 128, 0, 0]), new Int16Array([-4, 123, 10, -1]), new Int16Array([-6, 110, 26, -2]), new Int16Array([-7, 92, 47, -4]), new Int16Array([-6, 70, 70, -6]), new Int16Array([-4, 47, 92, -7]), new Int16Array([-2, 26, 110, -6]), new Int16Array([-1, 10, 123, -4])], [new Int16Array([0, 128, 0, 0]), new Int16Array([-5, 124, 10, -1]), new Int16Array([-7, 110, 27, -2]), new Int16Array([-7, 91, 48, -4]), new Int16Array([-6, 70, 70, -6]), new Int16Array([-4, 48, 92, -8]), new Int16Array([-2, 27, 110, -7]), new Int16Array([-1, 10, 124, -5])], [new Int16Array([0, 128, 0, 0]), new Int16Array([-6, 124, 11, -1]), new Int16Array([-8, 111, 28, -3]), new Int16Array([-8, 92, 49, -5]), new Int16Array([-7, 71, 71, -7]), new Int16Array([-5, 49, 92, -8]), new Int16Array([-3, 28, 111, -8]), new Int16Array([-1, 11, 124, -6])], [new Int16Array([0, 128, 0, 0]), new Int16Array([-6, 123, 12, -1]), new Int16Array([-9, 111, 29, -3]), new Int16Array([-9, 93, 50, -6]), new Int16Array([-8, 72, 72, -8]), new Int16Array([-6, 50, 93, -9]), new Int16Array([-3, 29, 111, -9]), new Int16Array([-1, 12, 123, -6])], [new Int16Array([0, 128, 0, 0]), new Int16Array([-7, 124, 12, -1]), new Int16Array([-10, 111, 30, -3]), new Int16Array([-10, 93, 51, -6]), new Int16Array([-9, 73, 73, -9]), new Int16Array([-6, 51, 93, -10]), new Int16Array([-3, 30, 111, -10]), new Int16Array([-1, 12, 124, -7])], [new Int16Array([0, 128, 0, 0]), new Int16Array([-7, 123, 13, -1]), new Int16Array([-11, 112, 31, -4]), new Int16Array([-11, 94, 52, -7]), new Int16Array([-10, 74, 74, -10]), new Int16Array([-7, 52, 94, -11]), new Int16Array([-4, 31, 112, -11]), new Int16Array([-1, 13, 123, -7])], [new Int16Array([0, 128, 0, 0]), new Int16Array([-8, 124, 13, -1]), new Int16Array([-12, 112, 32, -4]), new Int16Array([-12, 94, 53, -7]), new Int16Array([-10, 74, 74, -10]), new Int16Array([-7, 53, 94, -12]), new Int16Array([-4, 32, 112, -12]), new Int16Array([-1, 13, 124, -8])], [new Int16Array([0, 128, 0, 0]), new Int16Array([-9, 124, 14, -1]), new Int16Array([-13, 112, 33, -4]), new Int16Array([-13, 95, 54, -8]), new Int16Array([-11, 75, 75, -11]), new Int16Array([-8, 54, 95, -13]), new Int16Array([-4, 33, 112, -13]), new Int16Array([-1, 14, 124, -9])], [new Int16Array([0, 128, 0, 0]), new Int16Array([-9, 123, 15, -1]), new Int16Array([-14, 113, 34, -5]), new Int16Array([-14, 95, 55, -8]), new Int16Array([-12, 76, 76, -12]), new Int16Array([-8, 55, 95, -14]), new Int16Array([-5, 34, 112, -13]), new Int16Array([-1, 15, 123, -9])], [new Int16Array([0, 128, 0, 0]), new Int16Array([-10, 124, 15, -1]), new Int16Array([-14, 113, 34, -5]), new Int16Array([-15, 96, 56, -9]), new Int16Array([-13, 77, 77, -13]), new Int16Array([-9, 56, 96, -15]), new Int16Array([-5, 34, 113, -14]), new Int16Array([-1, 15, 124, -10])], [new Int16Array([0, 128, 0, 0]), new Int16Array([-10, 123, 16, -1]), new Int16Array([-15, 113, 35, -5]), new Int16Array([-16, 98, 56, -10]), new Int16Array([-14, 78, 78, -14]), new Int16Array([-10, 56, 98, -16]), new Int16Array([-5, 35, 113, -15]), new Int16Array([-1, 16, 123, -10])], [new Int16Array([0, 128, 0, 0]), new Int16Array([-11, 124, 17, -2]), new Int16Array([-16, 113, 36, -5]), new Int16Array([-17, 98, 57, -10]), new Int16Array([-14, 78, 78, -14]), new Int16Array([-10, 57, 98, -17]), new Int16Array([-5, 36, 113, -16]), new Int16Array([-2, 17, 124, -11])], [new Int16Array([0, 128, 0, 0]), new Int16Array([-12, 125, 17, -2]), new Int16Array([-17, 114, 37, -6]), new Int16Array([-18, 99, 58, -11]), new Int16Array([-15, 79, 79, -15]), new Int16Array([-11, 58, 99, -18]), new Int16Array([-6, 37, 114, -17]), new Int16Array([-2, 17, 125, -12])], [new Int16Array([0, 128, 0, 0]), new Int16Array([-12, 124, 18, -2]), new Int16Array([-18, 114, 38, -6]), new Int16Array([-19, 99, 59, -11]), new Int16Array([-16, 80, 80, -16]), new Int16Array([-11, 59, 99, -19]), new Int16Array([-6, 38, 114, -18]), new Int16Array([-2, 18, 124, -12])], [new Int16Array([0, 128, 0, 0]), new Int16Array([-4, 118, 16, -2]), new Int16Array([-7, 106, 34, -5]), new Int16Array([-8,  90, 53, -7]), new Int16Array([-8,  72, 72, -8]), new Int16Array([-7,  53, 90, -8]), new Int16Array([-5,  34, 106, -7]), new Int16Array([-2,  16, 118, -4])]];
	const VP6_DEFAULT_SCAN_ORDER = new Uint32Array([0, 0, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 4, 4, 4, 5, 5, 5, 5, 6, 6, 7, 7, 7, 7, 7, 8, 8, 9, 9, 9, 9, 9, 9, 10, 10, 11, 11, 11, 11, 11, 11, 12, 12, 12, 12, 12, 12, 13, 13, 13, 13, 13, 14, 14, 14, 14, 15, 15, 15, 15, 15, 15]);
	const VP6_INTERLACED_SCAN_ORDER = new Uint32Array([0, 1, 0, 1, 1, 2, 5, 3, 2, 2, 2, 2, 4, 7, 8, 10, 9, 7, 5, 4, 2, 3, 5, 6, 8, 9, 11, 12, 13, 12, 11, 10, 9, 7, 5, 4, 6, 7, 9, 11, 12, 12, 13, 13, 14, 12, 11, 9, 7, 9, 11, 12, 14, 14, 14, 15, 13, 11, 13, 15, 15, 15, 15, 15]);
	const VP_YUVA420_FORMAT = new NAPixelFormaton({
		model: new ColorModel(ColorModel.YUV, new YUVSubmodel(YUVSubmodel.YUVJ)),
		components: 4,
		comp_info:  [new NAPixelChromaton({ h_ss: 0, v_ss: 0, packed: false, depth: 8, shift: 0, comp_offs: 0, next_elem: 1}), new NAPixelChromaton({ h_ss: 1, v_ss: 1, packed: false, depth: 8, shift: 0, comp_offs: 1, next_elem: 1}), new NAPixelChromaton({ h_ss: 1, v_ss: 1, packed: false, depth: 8, shift: 0, comp_offs: 2, next_elem: 1}), new NAPixelChromaton({ h_ss: 0, v_ss: 0, packed: false, depth: 8, shift: 0, comp_offs: 3, next_elem: 1}), null],
		elem_size: 0,
		be: false,
		alpha: true,
		palette: false
	});
	const VP_REF_INTER = 1;
	const VP_REF_GOLDEN = 2;
	class VPMBType {
		constructor(type) {
			this.type = type;
		}
		is_intra() {
			return this.type == VPMBType.Intra;
		}
		get_ref_id() {
			switch (this.type) {
				case VPMBType.Intra:
					return 0;
				case VPMBType.InterNoMV:
				case VPMBType.InterMV:
				case VPMBType.InterNearest:
				case VPMBType.InterNear:
				case VPMBType.InterFourMV:
					return VP_REF_INTER;
				default:
					return VP_REF_GOLDEN;
			}
		}
	}
	VPMBType.Intra = 1;
	VPMBType.InterNoMV = 2;
	VPMBType.InterMV = 3;
	VPMBType.InterNearest = 4;
	VPMBType.InterNear = 5;
	VPMBType.InterFourMV = 6;
	VPMBType.GoldenNoMV = 7;
	VPMBType.GoldenMV = 8;
	VPMBType.GoldenNearest = 9;
	VPMBType.GoldenNear = 10;
	class VPShuffler {
		constructor() {
			this.lastframe = null;
			this.goldframe = null;
		}
		clear() {
			this.lastframe = null;
			this.goldframe = null;
		}
		add_frame(buf) {
			this.lastframe = buf;
		}
		add_golden_frame(buf) {
			this.goldframe = buf;
		}
		get_last() {
			return this.lastframe;
		}
		get_golden() {
			return this.goldframe;
		}
		has_refs() {
			return !!this.lastframe;
		}
	}
	const VP56_COEF_BASE = new Int16Array([5, 7, 11, 19, 35, 67]);
	const VP56_COEF_ADD_PROBS = [new Uint8Array([159, 128, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), new Uint8Array([165, 145, 128, 0, 0, 0, 0, 0, 0, 0, 0, 0]), new Uint8Array([173, 148, 140, 128, 0, 0, 0, 0, 0, 0, 0, 0]), new Uint8Array([176, 155, 140, 135, 128, 0, 0, 0, 0, 0, 0, 0]), new Uint8Array([180, 157, 141, 134, 130, 128, 0, 0, 0, 0, 0, 0]), new Uint8Array([254, 254, 243, 230, 196, 177, 153, 140, 133, 130, 129, 128])];
	const ff_vp56_norm_shift = new Uint8Array([8, 7, 6, 6, 5, 5, 5, 5, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
	class BoolCoder {
		constructor(src) {
			if (src.length < 3)
				throw new Error("DecoderError::ShortData");
			let value = asU32(asU32(src[0] << 24) | asU32(src[1] << 16) | asU32(src[2] << 8) | asU32(src[3]));
			this.src = src;
			this.pos = 4;
			this.value = value;
			this.range = 255;
			this.bits = 8;
		}
		read_bool() {
			return this.read_prob(128);
		}
		read_prob(prob) {
			this.renorm();
			let split = asU32(1 + asU32((asU32(this.range - 1) * asU32(prob)) >> 8));
			let bit;
			if (asU32(this.value) < asU32(split << 24)) {
				this.range = split;
				bit = false;
			} else {
				this.range -= split;
				this.range = asU32(this.range);
				this.value -= asU32(split << 24);
				this.value = asU32(this.value);
				bit = true;
			}
			return bit;
		}
		read_bits(bits) {
			let val = 0;
			for (var i = 0; i < bits; i++) {
				val = (val << 1) | asU32(this.read_prob(128));
				val = asU32(val);
			}
			return asU32(val);
		}
		read_probability() {
			let val = asU8(this.read_bits(7));
			if (val == 0) {
				return 1;
			} else {
				return asU8(val << 1);
			}
		}
		renorm() {
			let shift = ff_vp56_norm_shift[this.range];
			this.range <<= asU32(shift);
			this.value <<= asU32(shift);
			this.range = asU32(this.range);
			this.value = asU32(this.value);
			this.bits -= asI32(shift);
			if ((this.bits <= 0) && (this.pos < this.src.length)) {
				this.value |= (this.src[this.pos] << asU8(-this.bits));
				this.pos += 1;
				this.bits += 8;
			}
		}
		skip_bytes(nbytes) {
			for (var i = 0; i < nbytes; i++) {
				this.value <<= 8;
				if (this.pos < this.src.length) {
					this.value |= (this.src[this.pos]);
					this.pos += 1;
				}
			}
		}
	}
	function rescale_prob(prob, weights, maxval) {
		return asU8(Math.max(Math.min((((asI32(asU8(prob)) * asI32(weights[0]) + 128) >> 8) + asI32(weights[1])), maxval), 1));
	}
	const C1S7 = 64277;
	const C2S6 = 60547;
	const C3S5 = 54491;
	const C4S4 = 46341;
	const C5S3 = 36410;
	const C6S2 = 25080;
	const C7S1 = 12785;
	function mul16(a, b) {
		return (a * b) >> 16;
	}
	function idct_step(src, dst, $s0, $s1, $s2, $s3, $s4, $s5, $s6, $s7, $d0, $d1, $d2, $d3, $d4, $d5, $d6, $d7, $bias, $shift, $otype) {
		var t_a  = mul16(C1S7, (src[$s1])) + mul16(C7S1, src[$s7]);
		var t_b  = mul16(C7S1, (src[$s1])) - mul16(C1S7, src[$s7]);
		var t_c  = mul16(C3S5, (src[$s3])) + mul16(C5S3, src[$s5]);
		var t_d  = mul16(C3S5, (src[$s5])) - mul16(C5S3, src[$s3]);
		var t_a1 = mul16(C4S4, t_a - t_c);
		var t_b1 = mul16(C4S4, t_b - t_d);
		var t_c  = t_a + t_c;
		var t_d  = t_b + t_d;
		var t_e  = mul16(C4S4, (src[$s0] + src[$s4])) + $bias;
		var t_f  = mul16(C4S4, (src[$s0] - src[$s4])) + $bias;
		var t_g  = mul16(C2S6, (src[$s2])) + mul16(C6S2, (src[$s6]));
		var t_h  = mul16(C6S2, (src[$s2])) - mul16(C2S6, (src[$s6]));
		var t_e1 = (t_e - t_g);
		var t_g  = (t_e + t_g);
		var t_a  = (t_f + t_a1);
		var t_f  = (t_f - t_a1);
		var t_b  = (t_b1 - t_h);
		var t_h  = (t_b1 + t_h);
		dst[$d0] = $otype((t_g  + t_c) >> $shift);
		dst[$d1] = $otype((t_a  + t_h) >> $shift);
		dst[$d2] = $otype((t_a  - t_h) >> $shift);
		dst[$d3] = $otype((t_e1 + t_d) >> $shift);
		dst[$d4] = $otype((t_e1 - t_d) >> $shift);
		dst[$d5] = $otype((t_f  + t_b) >> $shift);
		dst[$d6] = $otype((t_f  - t_b) >> $shift);
		dst[$d7] = $otype((t_g  - t_c) >> $shift);
	}
	function vp_idct(coeffs) {
		let tmp = new Int32Array(64);
		for (var i = 0; i < 8; i++) {
			idct_step(
				coeffs, tmp,
				(i * 8), (i * 8) + 1, (i * 8) + 2, (i * 8) + 3, (i * 8) + 4, (i * 8) + 5, (i * 8) + 6, (i * 8) + 7,
				(i * 8), (i * 8) + 1, (i * 8) + 2, (i * 8) + 3, (i * 8) + 4, (i * 8) + 5, (i * 8) + 6, (i * 8) + 7,
				0, 0, asI32
			);
		}
		for (var i = 0; i < 8; i++) {
			idct_step(
				tmp, coeffs,
				(0 * 8) + i, (1 * 8) + i, (2 * 8) + i, (3 * 8) + i, (4 * 8) + i, (5 * 8) + i, (6 * 8) + i, (7 * 8) + i,
				(0 * 8) + i, (1 * 8) + i, (2 * 8) + i, (3 * 8) + i, (4 * 8) + i, (5 * 8) + i, (6 * 8) + i, (7 * 8) + i,
				8, 4, asI16
			);
		}
	}
	function vp_idct_dc(coeffs) {
		let dc = asI16((mul16(C4S4, mul16(C4S4, asI32(coeffs[0]))) + 8) >> 4);
		for (let i = 0; i < 64; i++) {
			coeffs[i] = dc;
		}
	}
	function vp_put_block(coeffs, bx, by, plane, frm) {
		var data = frm.data;
		vp_idct(coeffs);
		let off = frm.offset[plane] + ((bx * 8) + ((by * 8) * frm.stride[plane]));
		for (var y = 0; y < 8; y++) {
			for (var x = 0; x < 8; x++) {
				data[off + x] = asU8(Math.max(Math.min((coeffs[x + (y * 8)] + 128), 255), 0));
			}
			off += frm.stride[plane];
		}
	}
	function vp_put_block_ilace(coeffs, bx, by, plane, frm) {
		var data = frm.data;
		vp_idct(coeffs);
		let off = frm.offset[plane] + bx * 8 + ((by - 1) * 8 + (by + 1)) * frm.stride[plane];
		for (let y = 0; y < array.length; y++) {
			for (let x = 0; x < array.length; x++) {
				data[off + x] = asU8(Math.max(Math.min((coeffs[x + y * 8] + 128), 255), 0));
			}
			off += frm.stride[plane] * 2;
		}
	}
	function vp_put_block_dc(coeffs, bx, by, plane, frm) {
		var data = frm.data;
		vp_idct_dc(coeffs);
		let dc = asU8(Math.max(Math.min((coeffs[0] + 128), 255), 0));
		let off = frm.offset[plane] + bx * 8 + by * 8 * frm.stride[plane];
		for (let y = 0; y < 8; y++) {
			for (let x = 0; x < 8; x++) {
				data[off + x] = dc;
			}
			off += frm.stride[plane];
		}
	}
	function vp_add_block(coeffs, bx, by, plane, frm) {
		var data = frm.data;
		vp_idct(coeffs);
		let off = frm.offset[plane] + bx * 8 + by * 8 * frm.stride[plane];
		for (let y = 0; y < 8; y++) {
			for (let x = 0; x < 8; x++) {
				data[off + x] = asU8(Math.max(Math.min((coeffs[x + y * 8] + asI16(data[off + x])), 255), 0));
			}
			off += frm.stride[plane];
		}
	}
	function vp_add_block_ilace(coeffs, bx, by, plane, frm) {
		var data = frm.data;
		vp_idct(coeffs);
		let off = frm.offset[plane] + bx * 8 + ((by - 1) * 8 + (by + 1)) * frm.stride[plane];
		for (let y = 0; y < 8; y++) {
			for (let x = 0; x < 8; x++) {
				data[off + x] = asU8(Math.max(Math.min((coeffs[x + y * 8] + asI16(data[off + x])), 255), 0));
			}
			off += frm.stride[plane] * 2;
		}
	}
	function vp_add_block_dc(coeffs, bx, by, plane, frm) {
		var data = frm.data;
		vp_idct_dc(coeffs);
		let dc = coeffs[0];
		let off = frm.offset[plane] + bx * 8 + by * 8 * frm.stride[plane];
		for (let y = 0; y < 8; y++) {
			for (let x = 0; x < 8; x++) {
				data[off + x] = asU8(Math.max(Math.min((dc + asI16(data[off + x])), 255), 0));
			}
			off += frm.stride[plane];
		}
	}
	function vp31_loop_filter(data, off, step, stride, len, loop_str) {
		for (let _ = 0; _ < len; _++) {
			let a = asI16(data[off - step * 2]);
			let b = asI16(data[off - step]);
			let c = asI16(data[off]);
			let d = asI16(data[off + step]);
			let diff = ((a - d) + 3 * (c - b) + 4) >> 3;
			if (Math.abs(diff) >= 2 * loop_str) {
				diff = 0;
			} else if (Math.abs(diff) >= loop_str) {
				if (diff < 0) {
					diff = -diff - 2 * loop_str;
				} else {
					diff = -diff + 2 * loop_str;
				}
			}
			if (diff != 0) {
				data[off - step] = asU8(Math.min(Math.max((b + diff), 0), 255));
				data[off] = asU8(Math.min(Math.max((c - diff), 0), 255));
			}
			off += stride;
		}
	}
	class VP56Header {
		constructor() {
			this.is_intra = false;
			this.is_golden = false;
			this.quant = 0;
			this.multistream = false;
			this.use_huffman = false;
			this.version = 0;
			this.profile = 0;
			this.interlaced = false;
			this.offset = 0;
			this.mb_w = 0;
			this.mb_h = 0;
			this.disp_w = 0;
			this.disp_h = 0;
			this.scale = 0;
		}
	}
	class CoeffReader {
		constructor(type, value) {
			this.type = type;
			this.value = value;
		}
	}
	CoeffReader.None = 1;
	CoeffReader.Bool = 2;
	CoeffReader.Huff = 3;
	class VP56MVModel {
		constructor() {
			this.nz_prob = 0;
			this.sign_prob = 0;
			this.raw_probs = new Uint8Array(8);
			this.tree_probs = new Uint8Array(7);
		}
	}
	class VP56MBTypeModel {
		constructor() {
			this.probs = new Uint8Array(10);
		}
	}
	class VP56CoeffModel {
		constructor() {
			this.dc_token_probs = [[new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)], [new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)], [new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)], [new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)], [new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)], [new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)]];
			this.dc_value_probs = new Uint8Array(11);
			this.ac_ctype_probs = [[[new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)], [new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)], [new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)], [new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)], [new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)], [new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)]], [[new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)], [new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)], [new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)], [new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)], [new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)], [new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)]], [[new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)], [new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)], [new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)], [new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)], [new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)], [new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)]]];
			this.ac_type_probs = [[[[new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)], [new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)], [new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)]], [[new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)], [new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)], [new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)]], [[new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)], [new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)], [new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5), new Uint8Array(5)]]]];
			this.ac_val_probs = [[new Uint8Array(11), new Uint8Array(11), new Uint8Array(11), new Uint8Array(11), new Uint8Array(11), new Uint8Array(11)], [new Uint8Array(11), new Uint8Array(11), new Uint8Array(11), new Uint8Array(11), new Uint8Array(11), new Uint8Array(11)], [new Uint8Array(11), new Uint8Array(11), new Uint8Array(11), new Uint8Array(11), new Uint8Array(11), new Uint8Array(11)]];
		}
	}
	class VP6Models {
		constructor() {
			this.scan_order = new Uint32Array(64);
			this.scan = new Uint32Array(64);
			this.zigzag = new Uint32Array(64);
			this.zero_run_probs = [new Uint8Array(14), new Uint8Array(14)];
		}
	}
	const MAX_HUFF_ELEMS = 12;
	class VP6Huff {
		constructor() {
			this.codes = new Uint16Array(MAX_HUFF_ELEMS);
			this.bits = new Uint8Array(MAX_HUFF_ELEMS);
		}
	}
	const VP56_DC_QUANTS = new Int16Array([47, 47, 47, 47, 45, 43, 43, 43, 43, 43, 42, 41, 41, 40, 40, 40, 40, 35, 35, 35, 35, 33, 33, 33, 33, 32, 32, 32, 27, 27, 26, 26, 25, 25, 24, 24, 23, 23, 19, 19, 19, 19, 18, 18, 17, 16, 16, 16, 16, 16, 15, 11, 11, 11, 10, 10, 9, 8, 7, 5, 3, 3, 2, 2]);
	const VP56_AC_QUANTS = new Int16Array([94, 92, 90, 88, 86, 82, 78, 74, 70, 66, 62, 58, 54, 53, 52, 51, 50, 49, 48, 47, 46, 45, 44, 43, 42, 40, 39, 37, 36, 35, 34, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10,  9, 8, 7, 6, 5, 4, 3, 2, 1]);
	const VP56_FILTER_LIMITS = new Uint8Array([14, 14, 13, 13, 12, 12, 10, 10, 10, 10,  8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 7, 7, 7, 7, 7, 7, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 3, 2]);
	const VP56_MODE_VQ = [[new Uint8Array([9, 15, 32, 25, 7, 19, 9, 21, 1, 12, 14, 12, 3, 18, 14, 23, 3, 10, 0, 4]), new Uint8Array([48, 39, 1, 2, 11, 27, 29, 44, 7, 27, 1, 4, 0, 3, 1, 6, 1, 2, 0, 0]), new Uint8Array([21, 32, 1, 2, 4, 10, 32, 43, 6, 23, 2, 3, 1, 19, 1, 6, 12, 21, 0, 7]), new Uint8Array([69, 83, 0, 0, 0, 2, 10, 29, 3, 12, 0, 1, 0, 3, 0, 3, 2, 2, 0, 0]), new Uint8Array([11, 20, 1, 4, 18, 36, 43, 48, 13, 35, 0, 2, 0, 5, 3, 12, 1, 2, 0, 0]), new Uint8Array([70, 44, 0, 1, 2, 10, 37, 46, 8, 26, 0, 2, 0, 2, 0, 2, 0, 1, 0, 0]), new Uint8Array([8, 15, 0, 1, 8, 21, 74, 53, 22, 42, 0, 1, 0, 2, 0, 3, 1, 2, 0, 0]), new Uint8Array([141, 42, 0, 0, 1, 4, 11, 24, 1, 11, 0, 1, 0, 1, 0, 2, 0, 0, 0, 0]), new Uint8Array([8, 19, 4, 10, 24, 45, 21, 37, 9, 29, 0, 3, 1, 7, 11, 25, 0, 2, 0, 1]), new Uint8Array([46, 42, 0, 1, 2, 10, 54, 51, 10, 30, 0, 2, 0, 2, 0, 1, 0, 1, 0, 0]), new Uint8Array([28, 32, 0, 0, 3, 10, 75, 51, 14, 33, 0, 1, 0, 2, 0, 1, 1, 2, 0, 0]), new Uint8Array([100, 46, 0, 1, 3, 9, 21, 37, 5, 20, 0, 1, 0, 2, 1, 2, 0, 1, 0, 0]), new Uint8Array([27, 29, 0, 1, 9, 25, 53, 51, 12, 34, 0, 1, 0, 3, 1, 5, 0, 2, 0, 0]), new Uint8Array([80, 38, 0, 0, 1, 4, 69, 33, 5, 16, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0]), new Uint8Array([16, 20, 0, 0, 2, 8, 104, 49, 15, 33, 0, 1, 0, 1, 0, 1, 1, 1, 0, 0]), new Uint8Array([194, 16, 0, 0, 1, 1, 1, 9, 1, 3, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0])], [new Uint8Array([41, 22, 1, 0, 1, 31, 0, 0, 0, 0, 0, 1, 1, 7, 0, 1, 98, 25, 4, 10]), new Uint8Array([123, 37, 6, 4, 1, 27, 0, 0, 0, 0, 5, 8, 1, 7, 0, 1, 12, 10, 0, 2]), new Uint8Array([26, 14, 14, 12, 0, 24, 0, 0, 0, 0, 55, 17, 1, 9, 0, 36, 5, 7, 1, 3]), new Uint8Array([209, 5, 0, 0, 0, 27, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0]), new Uint8Array([2, 5, 4, 5, 0, 121, 0, 0, 0, 0, 0, 3, 2, 4, 1, 4, 2, 2, 0, 1]), new Uint8Array([175, 5, 0, 1, 0, 48, 0, 0, 0, 0, 0, 2, 0, 1, 0, 2, 0, 1, 0, 0]), new Uint8Array([83, 5, 2, 3, 0, 102, 0, 0, 0, 0, 1, 3, 0, 2, 0, 1, 0, 0, 0, 0]), new Uint8Array([233, 6, 0, 0, 0, 8, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0]), new Uint8Array([34, 16, 112, 21, 1, 28, 0, 0, 0, 0, 6, 8, 1, 7, 0, 3, 2, 5, 0, 2]), new Uint8Array([159, 35, 2, 2, 0, 25, 0, 0, 0, 0, 3, 6, 0, 5, 0, 1, 4, 4, 0, 1]), new Uint8Array([75, 39, 5, 7, 2, 48, 0, 0, 0, 0, 3, 11, 2, 16, 1, 4, 7, 10, 0, 2]), new Uint8Array([212, 21, 0, 1, 0, 9, 0, 0, 0, 0, 1, 2, 0, 2, 0, 0, 2, 2, 0, 0]), new Uint8Array([4, 2, 0, 0, 0, 172, 0, 0, 0, 0, 0, 1, 0, 2, 0, 0, 2, 0, 0, 0]), new Uint8Array([187, 22, 1, 1, 0, 17, 0, 0, 0, 0, 3, 6, 0, 4, 0, 1, 4, 4, 0, 1]), new Uint8Array([133, 6, 1, 2, 1, 70, 0, 0, 0, 0, 0, 2, 0, 4, 0, 3, 1, 1, 0, 0]), new Uint8Array([251, 1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])], [new Uint8Array([2, 3, 2, 3, 0, 2, 0, 2, 0, 0, 11, 4, 1, 4, 0, 2, 3, 2, 0, 4]), new Uint8Array([49, 46, 3, 4, 7, 31, 42, 41, 0, 0, 2, 6, 1, 7, 1, 4, 2, 4, 0, 1]), new Uint8Array([26, 25, 1, 1, 2, 10, 67, 39, 0, 0, 1, 1, 0, 14, 0, 2, 31, 26, 1, 6]), new Uint8Array([103, 46, 1, 2, 2, 10, 33, 42, 0, 0, 1, 4, 0, 3, 0, 1, 1, 3, 0, 0]), new Uint8Array([14, 31, 9, 13, 14, 54, 22, 29, 0, 0, 2, 6, 4, 18, 6, 13, 1, 5, 0, 1]), new Uint8Array([85, 39, 0, 0, 1, 9, 69, 40, 0, 0, 0, 1, 0, 3, 0, 1, 2, 3, 0, 0]), new Uint8Array([31, 28, 0, 0, 3, 14, 130, 34, 0, 0, 0, 1, 0, 3, 0, 1, 3, 3, 0, 1]), new Uint8Array([171, 25, 0, 0, 1, 5, 25, 21, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0]), new Uint8Array([17, 21, 68, 29, 6, 15, 13, 22, 0, 0, 6, 12, 3, 14, 4, 10, 1, 7, 0, 3]), new Uint8Array([51, 39, 0, 1, 2, 12, 91, 44, 0, 0, 0, 2, 0, 3, 0, 1, 2, 3, 0, 1]), new Uint8Array([81, 25, 0, 0, 2, 9, 106, 26, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 0, 0]), new Uint8Array([140, 37, 0, 1, 1, 8, 24, 33, 0, 0, 1, 2, 0, 2, 0, 1, 1, 2, 0, 0]), new Uint8Array([14, 23, 1, 3, 11, 53, 90, 31, 0, 0, 0, 3, 1, 5, 2, 6, 1, 2, 0, 0]), new Uint8Array([123, 29, 0, 0, 1, 7, 57, 30, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0]), new Uint8Array([13, 14, 0, 0, 4, 20, 175, 20, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 0, 0]), new Uint8Array([202, 23, 0, 0, 1, 3, 2, 9, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0])]];
	const INVALID_REF = 42;
	class VP6HuffModels {
		constructor() {
			this.dc_token_tree = [new VP6Huff(), new VP6Huff()];
			this.ac_token_tree = [[[new VP6Huff(), new VP6Huff(), new VP6Huff(), new VP6Huff(), new VP6Huff(), new VP6Huff()], [new VP6Huff(), new VP6Huff(), new VP6Huff(), new VP6Huff(), new VP6Huff(), new VP6Huff()], [new VP6Huff(), new VP6Huff(), new VP6Huff(), new VP6Huff(), new VP6Huff(), new VP6Huff()]], [[new VP6Huff(), new VP6Huff(), new VP6Huff(), new VP6Huff(), new VP6Huff(), new VP6Huff()], [new VP6Huff(), new VP6Huff(), new VP6Huff(), new VP6Huff(), new VP6Huff(), new VP6Huff()], [new VP6Huff(), new VP6Huff(), new VP6Huff(), new VP6Huff(), new VP6Huff(), new VP6Huff()]]];
			this.zero_run_tree = [new VP6Huff(), new VP6Huff()];
		}
	}
	class VP56Models {
		constructor() {
			this.mv_models = [new VP56MVModel(), new VP56MVModel()];
			this.mbtype_models = [[new VP56MBTypeModel(), new VP56MBTypeModel(), new VP56MBTypeModel(), new VP56MBTypeModel(), new VP56MBTypeModel(), new VP56MBTypeModel(), new VP56MBTypeModel(), new VP56MBTypeModel(), new VP56MBTypeModel(), new VP56MBTypeModel()], [new VP56MBTypeModel(), new VP56MBTypeModel(), new VP56MBTypeModel(), new VP56MBTypeModel(), new VP56MBTypeModel(), new VP56MBTypeModel(), new VP56MBTypeModel(), new VP56MBTypeModel(), new VP56MBTypeModel(), new VP56MBTypeModel()], [new VP56MBTypeModel(), new VP56MBTypeModel(), new VP56MBTypeModel(), new VP56MBTypeModel(), new VP56MBTypeModel(), new VP56MBTypeModel(), new VP56MBTypeModel(), new VP56MBTypeModel(), new VP56MBTypeModel(), new VP56MBTypeModel()]];
			this.coeff_models = [new VP56CoeffModel(), new VP56CoeffModel()];
			this.prob_xmitted = [new Uint8Array(20), new Uint8Array(20), new Uint8Array(20)];
			this.vp6models = new VP6Models();
			this.vp6huff = new VP6HuffModels();
		}
	}
	class MBInfo {
		constructor() {
			this.mb_type = new VPMBType(VPMBType.Intra);
			this.mv = new MV(0, 0);
		}
	}
	class FrameState {
		constructor() {
			this.mb_x = 0;
			this.mb_y = 0;
			this.plane = 0;
			this.coeff_cat = [new Uint8Array(64), new Uint8Array(64), new Uint8Array(64), new Uint8Array(64)];
			this.last_idx = new Uint32Array(4);
			this.top_ctx = 0;
			this.ctx_idx = 0;
			this.dc_quant = 0;
			this.ac_quant = 0;
			this.dc_zero_run = new Uint32Array(2);
			this.ac_zero_run = new Uint32Array(2);
		}
	}
	class VP56DCPred {
		constructor() {
			this.dc_y = new Int16Array(0);
			this.dc_u = new Int16Array(0);
			this.dc_v = new Int16Array(0);
			this.ldc_y = new Int16Array(2);
			this.ldc_u = 0;
			this.ldc_v = 0;
			this.ref_y = new Uint8Array(0);
			this.ref_c = new Uint8Array(0);
			this.ref_left = 0;
			this.y_idx = 0;
			this.c_idx = 0;
		}
		reset(mb_w) {
			this.update_row();
			for (var i = 1; i < this.ref_y.length; i++) {
				this.ref_y[i] = INVALID_REF;
			}
			for (var i = 1; i < this.ref_c.length; i++) {
				this.ref_c[i] = INVALID_REF;
			}
		}
		update_row() {
			this.y_idx = 1;
			this.c_idx = 1;
			this.ldc_y = new Int16Array(2);
			this.ldc_u = 0;
			this.ldc_v = 0;
			this.ref_left = INVALID_REF;
		}
		resize(mb_w) {
			this.dc_y = new Int16Array(mb_w * 2 + 2);
			this.dc_u = new Int16Array(mb_w + 2);
			this.dc_v = new Int16Array(mb_w + 2);
			this.ref_y = new Uint8Array(mb_w * 2 + 2);
			this.ref_y.fill(INVALID_REF);
			this.ref_c = new Uint8Array(mb_w + 2);
			this.ref_c.fill(INVALID_REF);
			this.ref_c[0] = 0;
		}
		next_mb() {
			this.y_idx += 2;
			this.c_idx += 1;
		}
	}
	function rescale_mb_mode_prob(prob, total) {
		return asU8(255 * prob / (1 + total));
	}
	function map_mb_type(mbtype) {
		switch(mbtype.type) {
			case VPMBType.InterNoMV: return 0;
			case VPMBType.Intra: return 1;
			case VPMBType.InterMV: return 2;
			case VPMBType.InterNearest: return 3;
			case VPMBType.InterNear: return 4;
			case VPMBType.GoldenNoMV: return 5;
			case VPMBType.GoldenMV: return 6;
			case VPMBType.InterFourMV: return 7;
			case VPMBType.GoldenNearest: return 8;
			case VPMBType.GoldenNear: return 9;
		}
	}
	class VP56Decoder {
		constructor(version, hasAlpha, flip) {
			let vt = alloc_video_buffer(new NAVideoInfo(24, 24, false, VP_YUVA420_FORMAT), 4);
			this.version = version;
			this.has_alpha = hasAlpha;
			this.flip = flip;
			this.shuf = new VPShuffler();
			this.width = 0;
			this.height = 0;
			this.mb_w = 0;
			this.mb_h = 0;
			this.models = new VP56Models();
			this.amodels = new VP56Models();
			this.coeffs = [new Int16Array(64), new Int16Array(64), new Int16Array(64), new Int16Array(64), new Int16Array(64), new Int16Array(64)];
			this.last_mbt = new VPMBType(VPMBType.InterNoMV);
			this.loop_thr = 0;
			this.ilace_prob = 0;
			this.ilace_mb = false;
			this.mb_info = [];
			this.fstate = new FrameState();
			this.dc_pred = new VP56DCPred();
			this.last_dc = [new Int16Array(4), new Int16Array(4), new Int16Array(4)];
			this.top_ctx = [new Uint8Array(0), new Uint8Array(0), new Uint8Array(0), new Uint8Array(0)];
			this.mc_buf = vt.get_vbuf();
		}
		set_dimensions(width, height) {
			this.width = width;
			this.height = height;
			this.mb_w = (this.width + 15) >> 4;
			this.mb_h = (this.height + 15) >> 4;
			this.mb_info = [];
			for (var i = 0; i < this.mb_w * this.mb_h; i++) {
				this.mb_info.push(new MBInfo());
			}
			this.top_ctx = [new Uint8Array(this.mb_w * 2), new Uint8Array(this.mb_w), new Uint8Array(this.mb_w), new Uint8Array(this.mb_w * 2)];
		}
		init(supp, vinfo) {
			supp.pool_u8.set_dec_bufs(3 + (vinfo.get_format().has_alpha() ? 1 : 0));
			supp.pool_u8.prealloc_video(new NAVideoInfo(vinfo.get_width(), vinfo.get_height(), false, vinfo.get_format()), 4);
			this.set_dimensions(vinfo.get_width(), vinfo.get_height());
			this.dc_pred.resize(this.mb_w);
		}
		decode_frame(supp, src, br) {
			let aoffset;
			let bc;
			if (this.has_alpha) {
				validate(src.length >= 7);
				aoffset = ((src[0]) << 16) | ((src[1]) << 8) | (src[2]);
				validate((aoffset > 0) && (aoffset < src.length - 3));
				bc = new BoolCoder(src.subarray(3));
			} else {
				validate(src.length >= 4);
				aoffset = src.length;
				bc = new BoolCoder(src);
			}
			let hdr = br.parseHeader(bc);
			validate((hdr.offset) < aoffset);
			if (hdr.mb_w != 0 && (hdr.mb_w != this.mb_w || hdr.mb_h != this.mb_h)) {
				this.set_dimensions(hdr.mb_w * 16, hdr.mb_h * 16);
			}
			let fmt = this.has_alpha ? VP_YUVA420_FORMAT : YUV420_FORMAT;
			let vinfo = new NAVideoInfo(this.width, this.height, this.flip, fmt);
			let ret = supp.pool_u8.get_free();
			if (ret === null) throw new Error("DecoderError::AllocError");
			let buf = ret;
			if (!buf.get_info().eq(vinfo)) {
				this.shuf.clear();
				supp.pool_u8.reset();
				supp.pool_u8.prealloc_video(vinfo, 4);
				let ret = supp.pool_u8.get_free();
				if (ret === null) throw new Error("DecoderError::AllocError");
				buf = ret;
			}
			let dframe = NASimpleVideoFrame.from_video_buf(buf);
			if (hdr.is_intra) {
				this.shuf.clear();
			} else {
				if (!this.shuf.has_refs()) {
					throw new Error("DecoderError::MissingReference");
				}
			}
			let psrc = src.subarray(this.has_alpha ? 3 : 0);
			this.decode_planes(br, dframe, bc, hdr, psrc, false);
			if (this.has_alpha) {
				let asrc = src.subarray(aoffset + 3);
				let _bc = new BoolCoder(asrc);
				let ahdr = br.parseHeader(_bc);
				validate(ahdr.mb_w == hdr.mb_w && ahdr.mb_h == hdr.mb_h);
				var models = this.models;
				this.models = this.amodels;
				this.decode_planes(br, dframe, _bc, ahdr, asrc, true);
				this.models = models;
				if (hdr.is_golden && ahdr.is_golden) {
					this.shuf.add_golden_frame(buf.cloned());
				} else if (hdr.is_golden && !ahdr.is_golden) {
					let cur_golden = this.shuf.get_golden();
					let off = cur_golden.get_offset(3);
					let stride = cur_golden.get_stride(3);
					let new_golden = supp.pool_u8.get_copy(buf);
					let dst = new_golden.get_data();
					let _src = cur_golden.get_data();
					dst.set(_src.subarray(off, off + (stride * this.mb_h * 16)), off);
					this.shuf.add_golden_frame(new_golden);
				} else if (!hdr.is_golden && ahdr.is_golden) {
					let cur_golden = this.shuf.get_golden();
					let off = cur_golden.get_offset(3);
					let stride = cur_golden.get_stride(3);
					let new_golden = supp.pool_u8.get_copy(cur_golden);
					let dst = new_golden.get_data();
					let _src = buf.get_data();
					dst.set(_src.subarray(off, off + (stride * this.mb_h * 16)), off);
					this.shuf.add_golden_frame(new_golden);
				}
			}
			if (hdr.is_golden && !this.has_alpha) this.shuf.add_golden_frame(buf.cloned());
			this.shuf.add_frame(buf.cloned());
			return [new NABufferType(NABufferType.Video, buf), hdr.is_intra];
		}
		reset_mbtype_models() {
			const DEFAULT_XMITTED_PROBS = [new Uint8Array([42, 69, 2, 1, 7, 1, 42, 44, 22, 6, 3, 1, 2, 0, 5, 1, 1, 0, 0, 0]), new Uint8Array([8, 229, 1, 1, 8, 0, 0, 0, 0, 0, 2, 1, 1, 0, 0, 0, 1, 1, 0, 0]), new Uint8Array([35, 122, 1, 1, 6, 1, 34, 46, 0, 0, 2, 1, 1, 0, 1, 0, 1, 1, 0, 0])];
			this.models.prob_xmitted[0].set(DEFAULT_XMITTED_PROBS[0], 0);
			this.models.prob_xmitted[1].set(DEFAULT_XMITTED_PROBS[1], 0);
			this.models.prob_xmitted[2].set(DEFAULT_XMITTED_PROBS[2], 0);
		}
		decode_planes(br, dframe, bc, hdr, src, alpha) {
			let cr;
			if (hdr.multistream) {
				let off = +hdr.offset.toString();
				if (!hdr.use_huffman) {
					let bc2 = new BoolCoder(src.subarray(off));
					cr = new CoeffReader(CoeffReader.Bool, bc2);
				} else {
					throw new Error("UnimplementedDecoding use_huffman");
				}
			} else {
				cr = new CoeffReader(CoeffReader.None);
			}
			if (hdr.is_intra) {
				br.reset_models(this.models);
				this.reset_mbtype_models();
			} else {
				this.decode_mode_prob_models(bc);
				br.decode_mv_models(bc, this.models.mv_models);
			}
			br.decode_coeff_models(bc, this.models, hdr.is_intra);
			if (hdr.use_huffman) {
				throw new Error("UnimplementedDecoding use_huffman");
			}
			if (hdr.interlaced) {
				this.ilace_prob = asU8(bc.read_bits(8));
			}
			this.fstate = new FrameState();
			this.fstate.dc_quant = asI16(VP56_DC_QUANTS[hdr.quant] * 4);
			this.fstate.ac_quant = asI16(VP56_AC_QUANTS[hdr.quant] * 4);
			this.loop_thr = asI16(VP56_FILTER_LIMITS[hdr.quant]);
			this.last_mbt = new VPMBType(VPMBType.InterNoMV);
			for (var i = 0; i < this.top_ctx.length; i++) {
				var vec = this.top_ctx[i];
				vec.fill(0);
			}
			this.last_dc = [new Int16Array(4), new Int16Array(4), new Int16Array(4)];
			this.last_dc[0][1] = 0x80;
			this.last_dc[0][2] = 0x80;
			this.dc_pred.reset();
			this.ilace_mb = false;
			for (var mb_y = 0; mb_y < this.mb_h; mb_y++) {
				this.fstate.mb_y = mb_y;
				this.fstate.coeff_cat[0].fill(0);
				this.fstate.coeff_cat[1].fill(0);
				this.fstate.coeff_cat[2].fill(0);
				this.fstate.coeff_cat[3].fill(0);
				this.fstate.last_idx.fill(24);
				for (var mb_x = 0; mb_x < this.mb_w; mb_x++) {
					this.fstate.mb_x = mb_x;
					this.decode_mb(dframe, bc, cr, br, hdr, alpha);
					this.dc_pred.next_mb();
				}
				this.dc_pred.update_row();
			}
		}
		decode_mode_prob_models(bc) {
			for (let ctx = 0; ctx < 3; ctx++) {
				if (bc.read_prob(174)) {
					let idx = bc.read_bits(4);
					for (let i = 0; i < 20; i++) {
						this.models.prob_xmitted[ctx][i ^ 1] = VP56_MODE_VQ[ctx][idx][i];
					}
				}
				if (bc.read_prob(254)) {
					for (let set = 0; set < 20; set++) {
						if (bc.read_prob(205)) {
							let sign = bc.read_bool();
							let diff = (bc.read_prob(171) ? (bc.read_prob(199) ? bc.read_bits(7) : (bc.read_prob(140) ? 3 : (bc.read_prob(125) ? 4 : (bc.read_prob(104) ? 5 : 6)))) : (bc.read_prob(83) ? 1 : 2)) * 4;
							validate(diff < 256);
							let _diff = asU8(diff);
							if (!sign) {
								validate(this.models.prob_xmitted[ctx][set ^ 1] <= 255 - _diff);
								this.models.prob_xmitted[ctx][set ^ 1] += _diff;
							} else {
								validate(this.models.prob_xmitted[ctx][set ^ 1] >= _diff);
								this.models.prob_xmitted[ctx][set ^ 1] -= _diff;
							}
						}
					}
				}
			}
			for (let ctx = 0; ctx < 3; ctx++) {
				let prob_xmitted = this.models.prob_xmitted[ctx];
				for (let mode = 0; mode < 10; mode++) {
					let mdl = this.models.mbtype_models[ctx][mode];
					let cnt = new Uint32Array(10);
					let total = 0;
					for (let i = 0; i < 10; i++) {
						if (i == mode) continue;
						cnt[i] = 100 * asU32(prob_xmitted[i * 2]);
						total += cnt[i];
					}
					let sum = asU32(prob_xmitted[mode * 2]) + asU32(prob_xmitted[mode * 2 + 1]);
					mdl.probs[9] = 255 - rescale_mb_mode_prob(asU32(prob_xmitted[mode * 2 + 1]), sum);
					let inter_mv0_weight = cnt[0] + cnt[2];
					let inter_mv1_weight = cnt[3] + cnt[4];
					let gold_mv0_weight = cnt[5] + cnt[6];
					let gold_mv1_weight = cnt[8] + cnt[9];
					let mix_weight = cnt[1] + cnt[7];
					mdl.probs[0] = 1 + rescale_mb_mode_prob(inter_mv0_weight + inter_mv1_weight, total);
					mdl.probs[1] = 1 + rescale_mb_mode_prob(inter_mv0_weight, inter_mv0_weight + inter_mv1_weight);
					mdl.probs[2] = 1 + rescale_mb_mode_prob(mix_weight, mix_weight + gold_mv0_weight + gold_mv1_weight);
					mdl.probs[3] = 1 + rescale_mb_mode_prob(cnt[0], inter_mv0_weight);
					mdl.probs[4] = 1 + rescale_mb_mode_prob(cnt[3], inter_mv1_weight);
					mdl.probs[5] = 1 + rescale_mb_mode_prob(cnt[1], mix_weight);
					mdl.probs[6] = 1 + rescale_mb_mode_prob(gold_mv0_weight, gold_mv0_weight + gold_mv1_weight);
					mdl.probs[7] = 1 + rescale_mb_mode_prob(cnt[5], gold_mv0_weight);
					mdl.probs[8] = 1 + rescale_mb_mode_prob(cnt[8], gold_mv1_weight);
				}
			}
		}
		find_mv_pred(ref_id) {
			const CAND_POS = [new Int8Array([-1, 0]), new Int8Array([0, -1]), new Int8Array([-1, -1]), new Int8Array([-1, 1]), new Int8Array([-2, 0]), new Int8Array([0, -2]), new Int8Array([-1, -2]), new Int8Array([-2, -1]), new Int8Array([-2, 1]), new Int8Array([-1, 2]), new Int8Array([-2, -2]), new Int8Array([-2, 2])];
			let nearest_mv = ZERO_MV;
			let near_mv = ZERO_MV;
			let pred_mv = ZERO_MV;
			let num_mv = 0;
			for (let i = 0; i < CAND_POS.length; i++) {
				let [yoff, xoff] = CAND_POS[i];
				let cx = (this.fstate.mb_x) + xoff;
				let cy = (this.fstate.mb_y) + yoff;
				if ((cx < 0) || (cy < 0)) continue;
				if ((cx >= this.mb_w) || (cy >= this.mb_h)) continue;
				let mb_pos = cx + cy * this.mb_w;
				let mv = this.mb_info[mb_pos].mv;
				if ((this.mb_info[mb_pos].mb_type.get_ref_id() != ref_id) || mv.eq(ZERO_MV)) continue;
				if (num_mv == 0) {
					nearest_mv = mv;
					num_mv += 1;
					if ((this.version > 5) && (i < 2)) pred_mv = mv;
				} else if (!(mv.eq(nearest_mv))) {
					near_mv = mv;
					num_mv += 1;
					break;
				}
			}
			return [num_mv, nearest_mv, near_mv, pred_mv];
		}
		decode_mb_type(bc, ctx) {
			let probs = this.models.mbtype_models[ctx][map_mb_type(this.last_mbt)].probs;
			if (!bc.read_prob(probs[9])) this.last_mbt = bc.read_prob(probs[0]) ? (bc.read_prob(probs[2]) ? (bc.read_prob(probs[6]) ? (bc.read_prob(probs[8]) ? new VPMBType(VPMBType.GoldenNear) : new VPMBType(VPMBType.GoldenNearest)) : (bc.read_prob(probs[7]) ? new VPMBType(VPMBType.GoldenMV) : new VPMBType(VPMBType.GoldenNoMV))) : (bc.read_prob(probs[5]) ? new VPMBType(VPMBType.InterFourMV) : new VPMBType(VPMBType.Intra))) : (bc.read_prob(probs[1]) ? (bc.read_prob(probs[4]) ? new VPMBType(VPMBType.InterNear) : new VPMBType(VPMBType.InterNearest)) : (bc.read_prob(probs[3]) ? new VPMBType(VPMBType.InterMV) : new VPMBType(VPMBType.InterNoMV)));
			return this.last_mbt;
		}
		decode_mb(frm, bc, cr, br, hdr, alpha) {
			const FOURMV_SUB_TYPE = [new VPMBType(VPMBType.InterNoMV), new VPMBType(VPMBType.InterMV), new VPMBType(VPMBType.InterNearest), new VPMBType(VPMBType.InterNear)];
			let mb_x = this.fstate.mb_x;
			let mb_y = this.fstate.mb_y;
			this.coeffs[0].fill(0);
			this.coeffs[1].fill(0);
			this.coeffs[2].fill(0);
			this.coeffs[3].fill(0);
			this.coeffs[4].fill(0);
			this.coeffs[5].fill(0);
			let mb_pos = mb_x + mb_y * this.mb_w;
			let four_mv = [ZERO_MV, ZERO_MV, ZERO_MV, ZERO_MV];
			let four_mbt = [new VPMBType(VPMBType.Intra), new VPMBType(VPMBType.Intra), new VPMBType(VPMBType.Intra), new VPMBType(VPMBType.Intra)];
			if (hdr.interlaced) {
				let iprob = this.ilace_prob;
				let prob;
				if (mb_x == 0) {
					prob = iprob;
				} else if (!this.ilace_mb) {
					prob = asU8(iprob + asU8(((256 - asU16(iprob)) >> 1)));
				} else {
					prob = asU8(iprob - (iprob >> 1));
				}
				this.ilace_mb = bc.read_prob(prob);
			}
			let num_mv;
			let nearest_mv;
			let near_mv;
			let pred_mv;
			if (hdr.is_intra) {
				num_mv = 0;
				nearest_mv = ZERO_MV;
				near_mv = ZERO_MV;
				pred_mv = ZERO_MV;
			} else {
				var ggdfd = this.find_mv_pred(VP_REF_INTER);
				num_mv = ggdfd[0];
				nearest_mv = ggdfd[1];
				near_mv = ggdfd[2];
				pred_mv = ggdfd[3];
			}
			let mb_type;
			if (hdr.is_intra) mb_type = new VPMBType(VPMBType.Intra);
			else mb_type = this.decode_mb_type(bc, (num_mv + 1) % 3);
			this.mb_info[mb_pos].mb_type = mb_type;
			if (mb_type.get_ref_id() != VP_REF_GOLDEN) {
				switch (mb_type.type) {
					case VPMBType.Intra:
					case VPMBType.InterNoMV:
						this.mb_info[mb_pos].mv = ZERO_MV;
						break;
					case VPMBType.InterMV:
						let diff_mv = this.decode_mv(bc, br);
						this.mb_info[mb_pos].mv = pred_mv.add(diff_mv);
						break;
					case VPMBType.InterNearest:
						this.mb_info[mb_pos].mv = nearest_mv;
						break;
					case VPMBType.InterNear:
						this.mb_info[mb_pos].mv = near_mv;
						break;
					case VPMBType.InterFourMV:
						for (var i = 0; i < 4; i++) {
							four_mbt[i] = FOURMV_SUB_TYPE[bc.read_bits(2)];
						}
						for (var i = 0; i < 4; i++) {
							switch (four_mbt[i].type) {
								case VPMBType.InterNoMV:
									break;
								case VPMBType.InterMV:
									let diff_mv = this.decode_mv(bc, br);
									four_mv[i] = pred_mv.add(diff_mv);
									break;
								case VPMBType.InterNearest:
									four_mv[i] = nearest_mv;
									break;
								case VPMBType.InterNear:
									four_mv[i] = near_mv;
									break;
								default:
									throw new Error("unreachable");
							}
						}
						this.mb_info[mb_pos].mv = four_mv[3];
						break;
					default:
						throw new Error("unreachable");
				}
			} else {
				let [_num_mv, nearest_mv, near_mv, pred_mv] = this.find_mv_pred(VP_REF_GOLDEN);
				switch (mb_type.type) {
					case VPMBType.GoldenNoMV:
						this.mb_info[mb_pos].mv = ZERO_MV;
						break;
					case VPMBType.GoldenMV:
						let diff_mv = this.decode_mv(bc, br);
						this.mb_info[mb_pos].mv = pred_mv.add(diff_mv);
						break;
					case VPMBType.GoldenNearest:
						this.mb_info[mb_pos].mv = nearest_mv;
						break;
					case VPMBType.GoldenNear:
						this.mb_info[mb_pos].mv = near_mv;
						break;
				}
			}
			if (!mb_type.is_intra() && (mb_type.type != VPMBType.InterFourMV)) {
				this.do_mc(br, frm, mb_type, this.mb_info[mb_pos].mv, alpha);
			} else if (mb_type.type == VPMBType.InterFourMV) {
				this.do_fourmv(br, frm, four_mv, alpha);
			}
			for (var blk_no = 0; blk_no < 4; blk_no++) {
				this.fstate.plane = (!alpha ? 0 : 3);
				this.fstate.ctx_idx = blk_no >> 1;
				this.fstate.top_ctx = this.top_ctx[this.fstate.plane][mb_x * 2 + (blk_no & 1)];
				switch (cr.type) {
					case CoeffReader.None:
						br.decode_block(bc, this.coeffs[blk_no], this.models.coeff_models[0], this.models.vp6models, this.fstate);
						break;
					case CoeffReader.Bool:
						br.decode_block(cr.value, this.coeffs[blk_no], this.models.coeff_models[0], this.models.vp6models, this.fstate);
						break;
				}
				this.top_ctx[this.fstate.plane][mb_x * 2 + (blk_no & 1)] = this.fstate.top_ctx;
				this.predict_dc(mb_type, mb_pos, blk_no, alpha);
				let bx = mb_x * 2 + (blk_no & 1);
				let by = mb_y * 2 + (blk_no >> 1);
				let has_ac = (this.fstate.last_idx[this.fstate.ctx_idx] > 0);
				if (mb_type.is_intra()) {
					if (!this.ilace_mb) {
						if (has_ac) {
							vp_put_block(this.coeffs[blk_no], bx, by, this.fstate.plane, frm);
						} else {
							vp_put_block_dc(this.coeffs[blk_no], bx, by, this.fstate.plane, frm);
						}
					} else {
						vp_put_block_ilace(this.coeffs[blk_no], bx, by, this.fstate.plane, frm);
					}
				} else {
					if (!this.ilace_mb) {
						if (has_ac) {
							vp_add_block(this.coeffs[blk_no], bx, by, this.fstate.plane, frm);
						} else {
							vp_add_block_dc(this.coeffs[blk_no], bx, by, this.fstate.plane, frm);
						}
					} else {
						vp_add_block_ilace(this.coeffs[blk_no], bx, by, this.fstate.plane, frm);
					}
				}
			}
			for (var blk_no = 4; blk_no < 6; blk_no++) {
				this.fstate.plane = blk_no - 3;
				this.fstate.ctx_idx = blk_no - 2;
				this.fstate.top_ctx = this.top_ctx[this.fstate.plane][mb_x];
				switch (cr.type) {
					case CoeffReader.None:
						br.decode_block(bc, this.coeffs[blk_no], this.models.coeff_models[1], this.models.vp6models, this.fstate);
						break;
					case CoeffReader.Bool:
						br.decode_block(cr.value, this.coeffs[blk_no], this.models.coeff_models[1], this.models.vp6models, this.fstate);
						break;
				}
				this.top_ctx[this.fstate.plane][mb_x] = this.fstate.top_ctx;
				this.predict_dc(mb_type, mb_pos, blk_no, alpha);
				if (!alpha) {
					let has_ac = this.fstate.last_idx[this.fstate.ctx_idx] > 0;
					if (mb_type.is_intra()) {
						if (has_ac) {
							vp_put_block(this.coeffs[blk_no], mb_x, mb_y, this.fstate.plane, frm);
						} else {
							vp_put_block_dc(this.coeffs[blk_no], mb_x, mb_y, this.fstate.plane, frm);
						}
					} else {
						if (has_ac) {
							vp_add_block(this.coeffs[blk_no], mb_x, mb_y, this.fstate.plane, frm);
						} else {
							vp_add_block_dc(this.coeffs[blk_no], mb_x, mb_y, this.fstate.plane, frm);
						}
					}
				}
			}
		}
		do_mc(br, frm, mb_type, mv, alpha) {
			let x = this.fstate.mb_x * 16;
			let y = this.fstate.mb_y * 16;
			let plane = ((!alpha) ? 0 : 3);
			let src;
			if (mb_type.get_ref_id() == VP_REF_INTER) src = this.shuf.get_last();
			else src = this.shuf.get_golden();
			br.mc_block(frm, this.mc_buf, src, plane, x + 0, y + 0, mv, this.loop_thr);
			br.mc_block(frm, this.mc_buf, src, plane, x + 8, y + 0, mv, this.loop_thr);
			br.mc_block(frm, this.mc_buf, src, plane, x + 0, y + 8, mv, this.loop_thr);
			br.mc_block(frm, this.mc_buf, src, plane, x + 8, y + 8, mv, this.loop_thr);
			if (!alpha) {
				let x = this.fstate.mb_x * 8;
				let y = this.fstate.mb_y * 8;
				br.mc_block(frm, this.mc_buf, src, 1, x, y, mv, this.loop_thr);
				br.mc_block(frm, this.mc_buf, src, 2, x, y, mv, this.loop_thr);
			}
		}
		do_fourmv(br, frm, mvs, alpha) {
			let x = this.fstate.mb_x * 16;
			let y = this.fstate.mb_y * 16;
			let plane;
			if (!alpha) {
				plane = 0;
			} else {
				plane = 3;
			};
			let src = this.shuf.get_last();
			for (let blk_no = 0; blk_no < 4; blk_no++) {
				br.mc_block(frm, this.mc_buf, src, plane, x + (blk_no & 1) * 8, y + (blk_no & 2) * 4, mvs[blk_no], this.loop_thr);
			}
			if (!alpha) {
				let x = this.fstate.mb_x * 8;
				let y = this.fstate.mb_y * 8;
				let sum = mvs[0].add(mvs[1].add(mvs[2].add(mvs[3])));
				let mv = new MV(asI16(sum.x / 4), asI16(sum.y / 4));
				br.mc_block(frm, this.mc_buf, src, 1, x, y, mv, this.loop_thr);
				br.mc_block(frm, this.mc_buf, src, 2, x, y, mv, this.loop_thr);
			}
		}
		decode_mv(bc, br) {
			let x = br.decode_mv(bc, this.models.mv_models[0]);
			let y = br.decode_mv(bc, this.models.mv_models[1]);
			return new MV(x, y);
		}
		predict_dc(mb_type, _mb_pos, blk_no, _alpha) {
			let is_luma = blk_no < 4;
			let plane;
			let dcs;
			switch (blk_no) {
				case 4:
					plane = 1;
					dcs = this.dc_pred.dc_u;
					break;
				case 5:
					plane = 2;
					dcs = this.dc_pred.dc_v;
					break;
				default:
					plane = 0;
					dcs = this.dc_pred.dc_y;
			}
			let dc_ref;
			let dc_idx;
			if (is_luma) {
				dc_ref = this.dc_pred.ref_y;
				dc_idx = this.dc_pred.y_idx + (blk_no & 1);
			} else {
				dc_ref = this.dc_pred.ref_c;
				dc_idx = this.dc_pred.c_idx;
			}
			let ref_id = mb_type.get_ref_id();
			let dc_pred = 0;
			let count = 0;
			let has_left_blk = is_luma && ((blk_no & 1) == 1);
			if (has_left_blk || this.dc_pred.ref_left == ref_id) {
				var _ = 0;
				switch (blk_no) {
					case 0:
					case 1:
						_ = this.dc_pred.ldc_y[0];
						break;
					case 2:
					case 3:
						_ = this.dc_pred.ldc_y[1];
						break;
					case 4:
						_ = this.dc_pred.ldc_u;
						break;
					default:
						_ = this.dc_pred.ldc_v;
				}
				dc_pred += _;
				count += 1;
			}
			if (dc_ref[dc_idx] == ref_id) {
				dc_pred += dcs[dc_idx];
				count += 1;
			}
			if (this.version == 5) {
				if ((count < 2) && (dc_ref[dc_idx - 1] == ref_id)) {
					dc_pred += dcs[dc_idx - 1];
					count += 1;
				}
				if ((count < 2) && (dc_ref[dc_idx + 1] == ref_id)) {
					dc_pred += dcs[dc_idx + 1];
					count += 1;
				}
			}
			if (count == 0) {
				dc_pred = this.last_dc[ref_id][plane];
			} else if (count == 2) {
				dc_pred /= 2;
				dc_pred = asI16(dc_pred);
			}
			this.coeffs[blk_no][0] += dc_pred;
			let dc = this.coeffs[blk_no][0];
			if (blk_no != 4) {
				dc_ref[dc_idx] = ref_id;
			}
			switch (blk_no) {
				case 0:
				case 1:
					this.dc_pred.ldc_y[0] = dc;
					break;
				case 2:
				case 3:
					this.dc_pred.ldc_y[1] = dc;
					break;
				case 4:
					this.dc_pred.ldc_u = dc;
					break;
				default:
					this.dc_pred.ldc_v = dc;
					this.dc_pred.ref_left = ref_id;
			}
			dcs[dc_idx] = dc;
			this.last_dc[ref_id][plane] = dc;
			this.coeffs[blk_no][0] = wrapping_mul_i16(this.coeffs[blk_no][0], this.fstate.dc_quant);
		}
	}
	const TOKEN_LARGE = 5;
	const TOKEN_EOB = 42;
	function update_scan(model) {
		let idx = 1;
		for (var band = 0; band < 16; band++) {
			for (var i = 1; i < 64; i++) {
				if (model.scan_order[i] == band) {
					model.scan[idx] = i;
					idx += 1;
				}
			}
		}
		for (var i = 1; i < 64; i++) {
			model.zigzag[i] = ZIGZAG[model.scan[i]];
		}
	}
	function reset_scan(model, interlaced) {
		if (!interlaced) {
			model.scan_order.set(VP6_DEFAULT_SCAN_ORDER, 0);
		} else {
			model.scan_order.set(VP6_INTERLACED_SCAN_ORDER, 0);
		}
		for (var i = 0; i < 64; i++) {
			model.scan[i] = i;
		}
		model.zigzag.set(ZIGZAG, 0);
	}
	function expand_token_bc(bc, val_probs, token, version) { // i16
		let sign = false;
		let level;
		if (token < TOKEN_LARGE) {
			if (token != 0) {
				sign = bc.read_bool();
			}
			level = asI16(token);
		} else {
			let cat = bc.read_prob(val_probs[6]) ? (bc.read_prob(val_probs[8]) ? (bc.read_prob(val_probs[10]) ? 5 : 4) : (bc.read_prob(val_probs[9]) ? 3 : 2)) : (bc.read_prob(val_probs[7]) ? 1 : 0);
			if (version == 5) {
				sign = bc.read_bool();
			}
			let add = 0; // i16
			let add_probs = VP56_COEF_ADD_PROBS[cat];
			for (var i = 0; i < add_probs.length; i++) {
				var prob = add_probs[i];
				if (prob == 128) {
					break;
				}
				add = (add << 1) | asI16(bc.read_prob(prob));
			}
			if (version != 5) {
				sign = bc.read_bool();
			}
			level = asI16(VP56_COEF_BASE[cat] + asI16(add));
		}
		if (!sign) {
			return asI16(level);
		} else {
			return asI16(-level);
		}
	}
	function decode_token_bc(bc, probs, prob34, is_dc, has_nnz) {
		if (has_nnz && !bc.read_prob(probs[0])) {
			if (is_dc || bc.read_prob(probs[1])) {
				return 0;
			} else {
				return TOKEN_EOB;
			}
		} else {
			return asU8(bc.read_prob(probs[2]) ? (bc.read_prob(probs[3]) ? TOKEN_LARGE : (bc.read_prob(probs[4]) ? (bc.read_prob(prob34) ? 4 : 3) : 2)) : 1);
		}
	}
	function decode_zero_run_bc(bc, probs) {
		let val = bc.read_prob(probs[0]) ? (bc.read_prob(probs[4]) ? 42 : (bc.read_prob(probs[5]) ? (bc.read_prob(probs[7]) ? 7 : 6) : (bc.read_prob(probs[6]) ? 5 : 4))) : (bc.read_prob(probs[1]) ? (bc.read_prob(probs[3]) ? 3 : 2) : (bc.read_prob(probs[2]) ? 1 : 0));
		if (val != 42) {
			return val;
		} else {
			let nval = 8;
			for (var i = 0; i < 6; i++) {
				nval += (bc.read_prob(probs[i + 8])) << i;
			}
			return nval;
		}
	}
	function get_block(dst, dstride, src, comp, dx, dy, mv_x, mv_y) {
		let [w, h] = src.get_dimensions(comp);
		let sx = dx + mv_x;
		let sy = dy + mv_y;
		if ((sx - 2 < 0) || (sx + 8 + 2 > (w)) || (sy - 2 < 0) || (sy + 8 + 2 > (h))) {
			edge_emu(src, sx - 2, sy - 2, 8 + 2 + 2, 8 + 2 + 2, dst, dstride, comp, 0);
		} else {
			let sstride = src.get_stride(comp);
			let soff    = src.get_offset(comp);
			let sdta    = src.get_data();
			let sbuf = sdta;
			let saddr = soff + ((sx - 2)) + ((sy - 2)) * sstride;
			var _t = 12;
			let a = 0;
			let b = 0;
			while(_t--) {
				dst[a + 0] = sbuf[(saddr + b) + 0];
				dst[a + 1] = sbuf[(saddr + b) + 1];
				dst[a + 2] = sbuf[(saddr + b) + 2];
				dst[a + 3] = sbuf[(saddr + b) + 3];
				dst[a + 4] = sbuf[(saddr + b) + 4];
				dst[a + 5] = sbuf[(saddr + b) + 5];
				dst[a + 6] = sbuf[(saddr + b) + 6];
				dst[a + 7] = sbuf[(saddr + b) + 7];
				dst[a + 8] = sbuf[(saddr + b) + 8];
				dst[a + 9] = sbuf[(saddr + b) + 9];
				dst[a + 10] = sbuf[(saddr + b) + 10];
				dst[a + 11] = sbuf[(saddr + b) + 11];
				a += dstride;
				b += sstride;
			}
		}
	}
	function calc_variance(var_off, src, stride) {
		let sum = 0;
		let ssum = 0;
		let j = 0;
		for (let _ = 0; _ < 4; _++) {
			for (let a = 0; a < 4; a++) {
				let el = src[(var_off + j) + (a * 2)];
				let pix = asU32(el);
				sum += pix;
				ssum += pix * pix;
			}
			j += stride * 2;
		}
		return asU16((ssum * 16 - sum * sum) >> 8);
	}
	function mc_filter_bilinear(a, b, c) {
		return asU8((asU16(a) * (8 - c) + asU16(b) * c + 4) >> 3);
	}
	function mc_bilinear(dst_offest, dst, dstride, src, soff, sstride, mx, my) {
		if (my == 0) {
			var dline_offest = 0;
			for (let _ = 0; _ < 8; _++) {
				for (let i = 0; i < 8; i++) {
					dst[(dst_offest + dline_offest) + i] = mc_filter_bilinear(src[soff + i], src[soff + i + 1], mx);
				}
				soff += sstride;
				dline_offest += dstride;
			}
		} else if (mx == 0) {
			var dline_offest = 0;
			for (let _ = 0; _ < 8; _++) {
				for (let i = 0; i < 8; i++) {
					dst[(dst_offest + dline_offest) + i] = mc_filter_bilinear(src[soff + i], src[soff + i + sstride], my);
				}
				soff += sstride;
				dline_offest += dstride;
			}
		} else {
			let tmp = new Uint8Array(8);
			for (let i = 0; i < 8; i++) {
				tmp[i] = mc_filter_bilinear(src[soff + i], src[soff + i + 1], mx);
			}
			soff += sstride;
			var dline_offest = 0;
			for (let _ = 0; _ < 8; _++) {
				for (let i = 0; i < 8; i++) {
					let cur = mc_filter_bilinear(src[soff + i], src[soff + i + 1], mx);
					dst[(dst_offest + dline_offest) + i] = mc_filter_bilinear(tmp[i], cur, my);
					tmp[i] = cur;
				}
				soff += sstride;
				dline_offest += dstride;
			}
		}
	}
	function mc_filter_bicubic($src, $off, $step, $coeffs) {
		return asU8(Math.max(Math.min(((asI32($src[$off - $step]) * asI32($coeffs[0]) + asI32($src[$off]) * asI32($coeffs[1]) + asI32($src[$off + $step]) * asI32($coeffs[2]) + asI32($src[$off + $step * 2]) * asI32($coeffs[3]) + 64) >> 7), 255), 0));
	}
	function mc_bicubic(dst_offest, dst, dstride, src, soff, sstride, coeffs_w, coeffs_h) {
		if (coeffs_h[1] == 128) {
			var dline_offest = 0;
			for (let _ = 0; _ < 8; _++) {
				for (let i = 0; i < 8; i++) {
					dst[(dst_offest + dline_offest) + i] = mc_filter_bicubic(src, soff + i, 1, coeffs_w);
				}
				soff += sstride;
				dline_offest += dstride;
			}
		} else if (coeffs_w[1] == 128) {
			var dline_offest = 0;
			for (let _ = 0; _ < 8; _++) {
				for (let i = 0; i < 8; i++) {
					dst[(dst_offest + dline_offest) + i] = mc_filter_bicubic(src, soff + i, sstride, coeffs_h);
				}
				soff += sstride;
				dline_offest += dstride;
			}
		} else {
			let buf = new Uint8Array(16 * 11);
			let a = 0;
			soff -= sstride;
			for (let _ = 0; _ < 11; _++) {
				for (let i = 0; i < 8; i++) {
					buf[a + i] = mc_filter_bicubic(src, soff + i, 1, coeffs_w);
				}
				soff += sstride;
				a += 16;
			}
			let _soff = 16;
			a = 0;
			for (let _ = 0; _ < 8; _++) {
				for (let i = 0; i < 8; i++) {
					dst[(dst_offest + a) + i] = mc_filter_bicubic(buf, _soff + i, 16, coeffs_h);
				}
				_soff += 16;
				a += dstride;
			}
		}
	}
	class VP6BR {
		constructor() {
			this.vpversion = 0;
			this.profile = 0;
			this.interlaced = false;
			this.do_pm = false;
			this.loop_mode = 0;
			this.autosel_pm = false;
			this.var_thresh = 0;
			this.mv_thresh = 0;
			this.bicubic = false;
			this.filter_alpha = 0;
		}
		parseHeader(bc) {
			let hdr = new VP56Header();
			let src = bc.src;
			let br = new Bits(src);
			hdr.is_intra = !br.read_bool();
			hdr.is_golden = hdr.is_intra;
			hdr.quant = br.read(6);
			hdr.multistream = br.read_bool();
			if (hdr.is_intra) {
				hdr.version = br.read(5);
				validate((hdr.version >= VERSION_VP60) && (hdr.version <= VERSION_VP62));
				hdr.profile = br.read(2);
				validate((hdr.profile == VP6_SIMPLE_PROFILE) || (hdr.profile == VP6_ADVANCED_PROFILE));
				hdr.interlaced = br.read_bool();
			} else {
				hdr.version = this.vpversion;
				hdr.profile = this.profile;
				hdr.interlaced = this.interlaced;
			}
			if (hdr.multistream || (hdr.profile == VP6_SIMPLE_PROFILE)) {
				hdr.offset = br.read(16);
				validate(hdr.offset > (hdr.is_intra ? 6 : 2));
				hdr.multistream = true;
			}
			let bytes = br.tell() >> 3;
			bc.skip_bytes(bytes);
			this.loop_mode = 0;
			if (hdr.is_intra) {
				hdr.mb_h = asU8(bc.read_bits(8));
				hdr.mb_w = asU8(bc.read_bits(8));
				hdr.disp_h = asU8(bc.read_bits(8));
				hdr.disp_w = asU8(bc.read_bits(8));
				validate((hdr.mb_h > 0) && (hdr.mb_w > 0));
				hdr.scale = bc.read_bits(2);
			} else {
				hdr.is_golden = bc.read_bool();
				if (hdr.profile == VP6_ADVANCED_PROFILE) {
					this.loop_mode = +bc.read_bool();
					if (this.loop_mode != 0) {
						this.loop_mode += +bc.read_bool();
						validate(this.loop_mode <= 1);
					}
					if (hdr.version == VERSION_VP62) {
						this.do_pm = bc.read_bool();
					}
				}
			}
			if ((hdr.profile == VP6_ADVANCED_PROFILE) && (hdr.is_intra || this.do_pm)) {
				this.autosel_pm = bc.read_bool();
				if (this.autosel_pm) {
					this.var_thresh = bc.read_bits(5);
					if (hdr.version != VERSION_VP62) {
						this.var_thresh <<= 5;
					}
					this.mv_thresh = bc.read_bits(3);
				} else {
					this.bicubic = bc.read_bool();
				}
				if (hdr.version == VERSION_VP62) {
					this.filter_alpha = bc.read_bits(4);
				} else {
					this.filter_alpha = 16;
				}
			}
			hdr.use_huffman = bc.read_bool();
			this.vpversion = hdr.version;
			this.profile = hdr.profile;
			this.interlaced = hdr.interlaced;
			return hdr;
		}
		decode_mv(bc, model) {
			let val;
			if (!bc.read_prob(model.nz_prob)) {
				val = bc.read_prob(model.tree_probs[0]) ? (bc.read_prob(model.tree_probs[4]) ? (bc.read_prob(model.tree_probs[6]) ? 7 : 6) : (bc.read_prob(model.tree_probs[5]) ? 5 : 4)) : (bc.read_prob(model.tree_probs[1]) ? (bc.read_prob(model.tree_probs[3]) ? 3 : 2) : (bc.read_prob(model.tree_probs[2]) ? 1 : 0));
			} else {
				let raw = 0;
				for (var i = 0; i < LONG_VECTOR_ORDER.length; i++) {
					var ord = LONG_VECTOR_ORDER[i];
					raw |= asI16(bc.read_prob(model.raw_probs[ord])) << ord;
				}
				if ((raw & 0xF0) != 0) {
					raw |= asI16(bc.read_prob(model.raw_probs[3])) << 3;
				} else {
					raw |= 1 << 3;
				}
				val = asI16(raw);
			}
			if ((val != 0) && bc.read_prob(model.sign_prob)) {
				return -val;
			} else {
				return val;
			}
		}
		reset_models(models) {
			for (var i = 0; i < models.mv_models.length; i++) {
				var mdl = models.mv_models[i];
				mdl.nz_prob = NZ_PROBS[i];
				mdl.sign_prob = 128;
				mdl.raw_probs.set(RAW_PROBS[i], 0);
				mdl.tree_probs.set(TREE_PROBS[i], 0);
			}
			models.vp6models.zero_run_probs[0].set(ZERO_RUN_PROBS[0], 0);
			models.vp6models.zero_run_probs[1].set(ZERO_RUN_PROBS[1], 0);
			reset_scan(models.vp6models, this.interlaced);
		}
		decode_mv_models(bc, models) {
			for (let comp = 0; comp < 2; comp++) {
				if (bc.read_prob(HAS_NZ_PROB[comp])) {
					models[comp].nz_prob = bc.read_probability();
				}
				if (bc.read_prob(HAS_SIGN_PROB[comp])) {
					models[comp].sign_prob = bc.read_probability();
				}
			}
			for (let comp = 0; comp < 2; comp++) {
				for (let i = 0; i < HAS_TREE_PROB[comp].length; i++) {
					const prob = HAS_TREE_PROB[comp][i];
					if (bc.read_prob(prob)) {
						models[comp].tree_probs[i] = bc.read_probability();
					}
				}
			}
			for (let comp = 0; comp < 2; comp++) {
				for (let i = 0; i < HAS_RAW_PROB[comp].length; i++) {
					const prob = HAS_RAW_PROB[comp][i];
					if (bc.read_prob(prob)) {
						models[comp].raw_probs[i] = bc.read_probability();
					}
				}
			}
		}
		decode_coeff_models(bc, models, is_intra) {
			let def_prob = new Uint8Array(11);
			def_prob.fill(128);
			for (var plane = 0; plane < 2; plane++) {
				for (var i = 0; i < 11; i++) {
					if (bc.read_prob(HAS_COEF_PROBS[plane][i])) {
						def_prob[i] = bc.read_probability();
						models.coeff_models[plane].dc_value_probs[i] = def_prob[i];
					} else if (is_intra) {
						models.coeff_models[plane].dc_value_probs[i] = def_prob[i];
					}
				}
			}
			if (bc.read_bool()) {
				for (var i = 1; i < 64; i++) {
					if (bc.read_prob(HAS_SCAN_UPD_PROBS[i])) {
						models.vp6models.scan_order[i] = bc.read_bits(4);
					}
				}
				update_scan(models.vp6models);
			} else {
				reset_scan(models.vp6models, this.interlaced);
			}
			for (var comp = 0; comp < 2; comp++) {
				for (var i = 0; i < 14; i++) {
					if (bc.read_prob(HAS_ZERO_RUN_PROBS[comp][i])) {
						models.vp6models.zero_run_probs[comp][i] = bc.read_probability();
					}
				}
			}
			for (var ctype = 0; ctype < 3; ctype++) {
				for (var plane = 0; plane < 2; plane++) {
					for (var group = 0; group < 6; group++) {
						for (var i = 0; i < 11; i++) {
							if (bc.read_prob(VP6_AC_PROBS[ctype][plane][group][i])) {
								def_prob[i] = bc.read_probability();
								models.coeff_models[plane].ac_val_probs[ctype][group][i] = def_prob[i];
							} else if (is_intra) {
								models.coeff_models[plane].ac_val_probs[ctype][group][i] = def_prob[i];
							}
						}
					}
				}
			}
			for (var plane = 0; plane < 2; plane++) {
				let mdl = models.coeff_models[plane];
				for (var i = 0; i < 3; i++) {
					for (var k = 0; k < 5; k++) {
						mdl.dc_token_probs[0][i][k] = rescale_prob(mdl.dc_value_probs[k], VP6_DC_WEIGHTS[k][i], 255);
					}
				}
			}
		}
		decode_block(bc, coeffs, model, vp6model, fstate) {
			var left_ctx = fstate.coeff_cat[fstate.ctx_idx][0];
			var top_ctx = fstate.top_ctx;
			var dc_mode = top_ctx + left_ctx;
			var token = decode_token_bc(bc, model.dc_token_probs[0][dc_mode], model.dc_value_probs[5], true, true);
			var val = expand_token_bc(bc, model.dc_value_probs, token, 6);
			coeffs[0] = val;
			fstate.last_idx[fstate.ctx_idx] = 0;
			var idx = 1;
			var last_val = val;
			while (idx < 64) {
				var ac_band = VP6_IDX_TO_AC_BAND[idx];
				var ac_mode = Math.min(Math.abs(last_val), 2);
				var has_nnz = (idx == 1) || (last_val != 0);
				var _token = decode_token_bc(bc, model.ac_val_probs[ac_mode][ac_band], model.ac_val_probs[ac_mode][ac_band][5], false, has_nnz);
				if (_token == 42) break;
				var _val = expand_token_bc(bc, model.ac_val_probs[ac_mode][ac_band], _token, 6);
				coeffs[vp6model.zigzag[idx]] = wrapping_mul_i16(_val, fstate.ac_quant);
				idx += 1;
				last_val = _val;
				if (_val == 0) {
					idx += decode_zero_run_bc(bc, vp6model.zero_run_probs[(idx >= 7) ? 1 : 0]);
					validate(idx <= 64);
				}
			}
			fstate.coeff_cat[fstate.ctx_idx][0] = (coeffs[0] != 0) ? 1 : 0;
			fstate.top_ctx = fstate.coeff_cat[fstate.ctx_idx][0];
			fstate.last_idx[fstate.ctx_idx] = idx;
		}
		mc_block(dst, mc_buf, src, plane, x, y, mv, loop_str) {
			let is_luma = (plane != 1) && (plane != 2);
			let sx, sy, mx, my, msx, msy;
			if (is_luma) {
				sx = mv.x >> 2;
				sy = mv.y >> 2;
				mx = (mv.x & 3) << 1;
				my = (mv.y & 3) << 1;
				msx = asI16(mv.x / 4);
				msy = asI16(mv.y / 4);
			} else {
				sx = mv.x >> 3;
				sy = mv.y >> 3;
				mx = mv.x & 7;
				my = mv.y & 7;
				msx = asI16(mv.x / 8);
				msy = asI16(mv.y / 8);
			}
			let tmp_blk = mc_buf.get_data();
			get_block(tmp_blk, 16, src, plane, x, y, sx, sy);
			if ((msx & 7) != 0) {
				let foff = (8 - (sx & 7));
				let off = 2 + foff;
				vp31_loop_filter(tmp_blk, off, 1, 16, 12, loop_str);
			}
			if ((msy & 7) != 0) {
				let foff = (8 - (sy & 7));
				let off = (2 + foff) * 16;
				vp31_loop_filter(tmp_blk, off, 16, 1, 12, loop_str);
			}
			let copy_mode = (mx == 0) && (my == 0);
			let bicubic = !copy_mode && is_luma && this.bicubic;
			if (is_luma && !copy_mode && (this.profile == VP6_ADVANCED_PROFILE)) {
				if (!this.autosel_pm) {
					bicubic = true;
				} else {
					let mv_limit = 1 << (this.mv_thresh + 1);
					if ((Math.abs(mv.x) <= mv_limit) && (Math.abs(mv.y) <= mv_limit)) {
						let var_off = 16 * 2 + 2;
						if (mv.x < 0) var_off += 1;
						if (mv.y < 0) var_off += 16;
						let _var = calc_variance(var_off, tmp_blk, 16);
						if (_var >= this.var_thresh) {
							bicubic = true;
						}
					}
				}
			}
			let dstride = dst.stride[plane];
			let dbuf = dst.data;
			let dbuf_offest = dst.offset[plane] + x + y * dstride;
			if (copy_mode) {
				let src_offest = 2 * 16 + 2;
				let dline_offest = 0;
				let sline_offest = 0;
				for (let _ = 0; _ < 8; _++) {
					dbuf[(dbuf_offest + dline_offest) + 0] = tmp_blk[(src_offest + sline_offest) + 0];
					dbuf[(dbuf_offest + dline_offest) + 1] = tmp_blk[(src_offest + sline_offest) + 1];
					dbuf[(dbuf_offest + dline_offest) + 2] = tmp_blk[(src_offest + sline_offest) + 2];
					dbuf[(dbuf_offest + dline_offest) + 3] = tmp_blk[(src_offest + sline_offest) + 3];
					dbuf[(dbuf_offest + dline_offest) + 4] = tmp_blk[(src_offest + sline_offest) + 4];
					dbuf[(dbuf_offest + dline_offest) + 5] = tmp_blk[(src_offest + sline_offest) + 5];
					dbuf[(dbuf_offest + dline_offest) + 6] = tmp_blk[(src_offest + sline_offest) + 6];
					dbuf[(dbuf_offest + dline_offest) + 7] = tmp_blk[(src_offest + sline_offest) + 7];
					dline_offest += dst.stride[plane];
					sline_offest += 16;
				}
			} else if (bicubic) {
				let coeff_h = VP6_BICUBIC_COEFFS[this.filter_alpha][mx];
				let coeff_v = VP6_BICUBIC_COEFFS[this.filter_alpha][my];
				mc_bicubic(dbuf_offest, dbuf, dstride, tmp_blk, 16 * 2 + 2, 16, coeff_h, coeff_v);
			} else {
				mc_bilinear(dbuf_offest, dbuf, dstride, tmp_blk, 16 * 2 + 2, 16, mx, my);
			}
		}
	}
	return {
		VP56Decoder,
		VP6BR,
		NADecoderSupport,
		BoolCoder,
		NAVideoInfo,
		YUV420_FORMAT,
		VP_YUVA420_FORMAT
	};
}());