var AT_H263_Decoder = (function() {
	const saturatingSub = function(a, b) {
		return a - b;
	}
	const asU8 = function(num) {
		return (num << 24) >>> 24;
	}
	const asI8 = function(num) {
		return (num << 24) >> 24;
	}
	const asU16 = function(num) {
		return (num << 16) >>> 16;
	}
	const asI16 = function(num) {
		return (num << 16) >> 16;
	}
	const asI32 = function(num) {
		return num | 0;
	}
	const num_signum = function(num) {
		if (num > 0) {
			return 1;
		} else if (num == 0) {
			return 0;
		} else {
			return -1;
		}
	}
	function num_clamp(value, a, b) {
		return Math.max(Math.min(value, b), a);
	}
	function asfgdgdfg(value, min, max) {
		return (value >= min) && (value <= max);
	}
	function op_cmp(a, b) {
		if (a > b) {
			return "greater";
		} else if (a < b) {
			return "less";
		} else {
			return "equal";
		}
	}
	const is_eof_error = function(type) {
		return (type == "EndOfFile") || (type == "_");
	}
	class Picture {
		constructor() {
			this.version = 0;
			this.temporal_reference = 0;
			this.format = null;
			this.options = null;
			this.has_plusptype = false;
			this.has_opptype = false;
			this.picture_type = null;
			this.motion_vector_range = null;
			this.slice_submode = null;
			this.scalability_layer = null;
			this.reference_picture_selection_mode = null;
			this.prediction_reference = 0;
			this.backchannel_message = null;
			this.reference_picture_resampling = null;
			this.quantizer = 0;
			this.multiplex_bitstream = 0;
			this.pb_reference = 0;
			this.pb_quantizer = null;
			this.extra = [];
		}
	}
	class PixelAspectRatio {
		constructor(type, value) {
			this.type = type;
			this.value = (value || null);
		}
	}
	PixelAspectRatio.Square = 1;
	PixelAspectRatio.Par12_11 = 2;
	PixelAspectRatio.Par10_11 = 3;
	PixelAspectRatio.Par16_11 = 4;
	PixelAspectRatio.Par40_33 = 5;
	PixelAspectRatio.Reserved = 6;
	PixelAspectRatio.Extended = 7;
	class CustomPictureFormat {
		constructor(pixelAspectRatio, pictureWidthIndication, pictureHeightIndication) {
			this.pixelAspectRatio = pixelAspectRatio;
			this.pictureWidthIndication = pictureWidthIndication;
			this.pictureHeightIndication = pictureHeightIndication;
		}
	}
	class MotionVectorRange {
		constructor(type) {
			this.type = type;
		}
	}
	MotionVectorRange.Extended = 0;
	MotionVectorRange.Unlimited = 1;
	class SourceFormat {
		constructor(type, value) {
			this.type = type;
			this.value = (value || null);
		}
		intoWidthAndHeight() {
			switch (this.type) {
				case SourceFormat.SubQcif:
					return [128, 96];
				case SourceFormat.QuarterCif:
					return [176, 144];
				case SourceFormat.FullCif:
					return [352, 288];
				case SourceFormat.FourCif:
					return [704, 576];
				case SourceFormat.SixteenCif:
					return [1408, 1152];
				case SourceFormat.Reserved:
					return null;
				case SourceFormat.Extended:
					return [this.value.pictureWidthIndication, this.value.pictureHeightIndication];
			}
		}
	}
	SourceFormat.SubQcif = 1;
	SourceFormat.QuarterCif = 2;
	SourceFormat.FullCif = 3;
	SourceFormat.FourCif = 4;
	SourceFormat.SixteenCif = 5;
	SourceFormat.Reserved = 6;
	SourceFormat.Extended = 7;
	class PictureTypeCode {
		constructor(type, value) {
			this.type = type;
			this.value = value;
		}
		is_any_pbframe() {
			return (this.type == PictureTypeCode.PbFrame) || (this.type == PictureTypeCode.ImprovedPbFrame);
		}
		is_disposable() {
			return this.type == PictureTypeCode.DisposablePFrame;
		}
		getType() {
			switch (this.type) {
				case PictureTypeCode.IFrame:
					return "IFrame";
				case PictureTypeCode.PFrame:
					return "PFrame";
				case PictureTypeCode.PbFrame:
					return "PbFrame";
				case PictureTypeCode.EiFrame:
					return "EiFrame";
				case PictureTypeCode.EpFrame:
					return "EpFrame";
				case PictureTypeCode.Reserved:
					return "Reserved";
				case PictureTypeCode.DisposablePFrame:
					return "DisposablePFrame";
			}
		}
	}
	PictureTypeCode.IFrame = 1;
	PictureTypeCode.PFrame = 2;
	PictureTypeCode.PbFrame = 3;
	PictureTypeCode.ImprovedPbFrame = 4;
	PictureTypeCode.BFrame = 5;
	PictureTypeCode.EiFrame = 6;
	PictureTypeCode.EpFrame = 7;
	PictureTypeCode.Reserved = 8;
	PictureTypeCode.DisposablePFrame = 9;
	class DecodedDctBlock {
		constructor(type, value) {
			this.type = type;
			this.value = value;
		}
	}
	DecodedDctBlock.Zero = 1;
	DecodedDctBlock.Dc = 2;
	DecodedDctBlock.Horiz = 3;
	DecodedDctBlock.Vert = 4;
	DecodedDctBlock.Full = 5;
	class PictureOption {
		constructor() {
			this.USE_SPLIT_SCREEN = false;
			this.USE_DOCUMENT_CAMERA = false;
			this.RELEASE_FULL_PICTURE_FREEZE = false;
			this.UNRESTRICTED_MOTION_VECTORS = false;
			this.SYNTAX_BASED_ARITHMETIC_CODING = false;
			this.ADVANCED_PREDICTION = false;
			this.ADVANCED_INTRA_CODING = false;
			this.DEBLOCKING_FILTER = false;
			this.SLICE_STRUCTURED = false;
			this.REFERENCE_PICTURE_SELECTION = false;
			this.INDEPENDENT_SEGMENT_DECODING = false;
			this.ALTERNATIVE_INTER_VLC = false;
			this.MODIFIED_QUANTIZATION = false;
			this.REFERENCE_PICTURE_RESAMPLING = false;
			this.REDUCED_RESOLUTION_UPDATE = false;
			this.ROUNDING_TYPE_ONE = false;
			this.USE_DEBLOCKER = false;
		}
		static empty() {
			return new PictureOption();
		}
	}
	function decodeSorensonPType(reader) {
		var source_format, bit_count;
		var dgf = reader.readBits(3);
		switch(dgf) {
			case 0:
				source_format = null;
				bit_count = 8;
				break;
			case 1:
				source_format = null;
				bit_count = 16;
				break;
			case 2:
				source_format = new SourceFormat(SourceFormat.FullCif);
				bit_count = 0;
				break;
			case 3:
				source_format = new SourceFormat(SourceFormat.QuarterCif);
				bit_count = 0;
				break;
			case 4:
				source_format = new SourceFormat(SourceFormat.SubQcif);
				bit_count = 0;
				break;
			case 5:
				source_format = new SourceFormat(SourceFormat.Extended, new CustomPictureFormat(new PixelAspectRatio(PixelAspectRatio.Square), 320, 240));
				bit_count = 0;
				break;
			case 6:
				source_format = new SourceFormat(SourceFormat.Extended, new CustomPictureFormat(new PixelAspectRatio(PixelAspectRatio.Square), 160, 120));
				bit_count = 0;
				break;
			default:
				source_format = new SourceFormat(SourceFormat.Reserved);
				bit_count = 0;
		}
		if (source_format === null) {
			let customWidth = reader.readBits(bit_count);
			let customHeight = reader.readBits(bit_count);
			source_format = new SourceFormat(SourceFormat.Extended, new CustomPictureFormat(new PixelAspectRatio(PixelAspectRatio.Square), customWidth, customHeight));
		}
		var fdgd = reader.readBits(2);
		var pictureType;
		switch(fdgd) {
			case 0:
				pictureType = new PictureTypeCode(PictureTypeCode.IFrame);
				break;
			case 1:
				pictureType = new PictureTypeCode(PictureTypeCode.PFrame);
				break;
			case 2:
				pictureType = new PictureTypeCode(PictureTypeCode.DisposablePFrame);
				break;
			default:
				pictureType = new PictureTypeCode(PictureTypeCode.Reserved, fdgd);
				break;
		}
		let options = PictureOption.empty();
		if (asU8(reader.readBits(1)) == 1) {
			options.USE_DEBLOCKER = true;
		}
		return [source_format, pictureType, options];
	}
	class DecodedPicture {
		constructor(picture_header, format) {
			let [w, h] = format.intoWidthAndHeight();
			let luma_samples = w * h;
			let luma = new Uint8Array(luma_samples);
			let chroma_w = Math.ceil(w / 2.0);
			let chroma_h = Math.ceil(h / 2.0);
			let chroma_samples = chroma_w * chroma_h;
			let chroma_b = new Uint8Array(chroma_samples);
			let chroma_r = new Uint8Array(chroma_samples);
			this.picture_header = picture_header;
			this.format = format;
			this.luma = luma;
			this.chroma_b = chroma_b;
			this.chroma_r = chroma_r;
			this.chroma_samples_per_row = chroma_w;
		}
		as_yuv() {
			return [this.luma, this.chroma_b, this.chroma_r];
		}
		as_header() {
			return this.picture_header;
		}
		as_luma_mut() {
			return this.luma;
		}
		as_chroma_b_mut() {
			return this.chroma_b;
		}
		as_chroma_r_mut() {
			return this.chroma_r;
		}
		as_luma() {
			return this.luma;
		}
		as_chroma_b() {
			return this.chroma_b;
		}
		as_chroma_r() {
			return this.chroma_r;
		}
		luma_samples_per_row() {
			return this.format.intoWidthAndHeight()[0];
		}
	}
	function decodePei(reader) {
		var data = [];
		while(true) {
			var hasPei = reader.readBits(1);
			if (hasPei == 1) {
				data.push(reader.readUint8());
			} else {
				break;
			}
		}
		return data;
	}
	function decodePicture(reader, decoderOptions, previous_picture) {
		var skippedBits = reader.recognizeStartCode(false);
		reader.skipBits(17 + skippedBits);
		var gob_id = reader.readBits(5);
		if (decoderOptions.sorensonSpark) {
			var temporalReference = reader.readUint8();
			var [source_format, pictureType, options] = decodeSorensonPType(reader);
			var quantizer = reader.readBits(5);
			var extra = decodePei(reader);
			var result = new Picture();
			result.version = gob_id;
			result.temporal_reference = temporalReference;
			result.format = source_format;
			result.options = options;
			result.has_plusptype = false;
			result.has_opptype = false;
			result.picture_type = pictureType;
			result.quantizer = quantizer;
			result.extra = extra;
			result.motion_vector_range = new MotionVectorRange(MotionVectorRange.Unlimited);
			result.slice_submode = null;
			result.scalability_layer = null;
			result.reference_picture_selection_mode = null;
			result.prediction_reference = null;
			result.backchannel_message = null;
			result.reference_picture_resampling = null;
			result.multiplex_bitstream = null;
			result.pb_reference = null;
			result.pb_quantizer = null;
			return result;
		}
	}
	class CodedBlockPattern {
		constructor(codes_luma, codes_chroma_b, codes_chroma_r) {
			this.codes_luma = codes_luma;
			this.codes_chroma_b = codes_chroma_b;
			this.codes_chroma_r = codes_chroma_r;
		}
	}
	class HalfPel {
		constructor(n) {
			this.n = n;
		}
		static zero() {
			return new HalfPel(0);
		}
		static from(float) {
			return new HalfPel(asI16(Math.floor(float * 2)));
		}
		static from_unit(unit) {
			return new HalfPel(asI16(unit));
		}
		is_mv_within_range(range) {
			return -range.n <= this.n && this.n < range.n;
		}
		invert() {
			switch (op_cmp(this.n, 0)) {
				case "greater":
					return new HalfPel(this.n - 64);
				case "less":
					return new HalfPel(this.n + 64);
				case "equal":
					return this;
			}
		}
		average_sum_of_mvs() {
			let whole = (this.n >> 4) << 1;
			let frac = this.n & 0x0F;
			if (asfgdgdfg(frac, 0, 2)) {
				return new HalfPel(whole);
			} else if (asfgdgdfg(frac, 14, 15)) {
				return new HalfPel(whole + 2);
			} else {
				return new HalfPel(whole + 1);
			}
		}
		median_of(mhs, rhs) {
			var num_self = this.n;
			var num_mhs = mhs.n;
			var num_rhs = rhs.n;
			if (num_self > num_mhs) {
				if (num_rhs > num_mhs) {
					if (num_rhs > num_self) {
						return this;
					} else {
						return rhs;
					}
				} else {
					return mhs;
				}
			} else if (num_mhs > num_rhs) {
				if (num_rhs > num_self) {
					return rhs;
				} else {
					return this;
				}
			} else {
				return mhs;
			}
		}
		into_lerp_parameters() {
			if (this.n % 2 == 0) {
				return [asI16(this.n / 2), false];
			} else if (this.n < 0) {
				return [asI16(this.n / 2 - 1), true];
			} else {
				return [asI16(this.n / 2), true];
			}
		}
	}
	HalfPel.STANDARD_RANGE = new HalfPel(32);
	HalfPel.EXTENDED_RANGE = new HalfPel(64);
	HalfPel.EXTENDED_RANGE_QUADCIF = new HalfPel(128);
	HalfPel.EXTENDED_RANGE_SIXTEENCIF = new HalfPel(256);
	HalfPel.EXTENDED_RANGE_BEYONDCIF = new HalfPel(512);
	class MotionVector {
		constructor(n1, n2) {
			this.n1 = n1;
			this.n2 = n2;
		}
		static zero() {
			return new MotionVector(HalfPel.zero(), HalfPel.zero());
		}
		median_of(mhs, rhs) {
			return new MotionVector(this.n1.median_of(mhs.n1, rhs.n1), this.n2.median_of(mhs.n2, rhs.n2));
		}
		into_lerp_parameters() {
			return [this.n1.into_lerp_parameters(), this.n2.into_lerp_parameters()];
		}
		add(rhs) {
			var g1 = asI16(this.n1.n + rhs.n1.n);
			var g2 = asI16(this.n2.n + rhs.n2.n);
			return new MotionVector(new HalfPel(g1), new HalfPel(g2));
		}
		average_sum_of_mvs() {
			return new MotionVector(this.n1.average_sum_of_mvs(), this.n2.average_sum_of_mvs());
		}
	}
	class IntraDc {
		constructor(n) {
			this.n = n;
		}
		static from_u8(value) {
			if (value == 0 || value == 128) {
				return null;
			} else {
				return new IntraDc(value);
			}
		}
		into_level() {
			if (this.n == 0xFF) {
				return 1024;
			} else {
				return asI16(asI16(asU16(this.n)) << 3);
			}
		}
	}
	class TCoefficient {
		constructor(is_short, run, level) {
			this.is_short = is_short;
			this.run = run;
			this.level = level;
		}
	}
	class Block {
		constructor(intradc, tcoef) {
			this.intradc = intradc;
			this.tcoef = tcoef;
		}
	}
	class VlcEntry {
		constructor(type, value) {
			this.type = type;
			this.value = value;
		}
	}
	VlcEntry.End = 1;
	VlcEntry.Fork = 2;
	class MacroblockType {
		constructor(type) {
			this.type = type;
		}
		is_inter() {
			return this.type == MacroblockType.Inter || this.type == MacroblockType.InterQ || this.type == MacroblockType.Inter4V || this.type == MacroblockType.Inter4Vq;
		}
		is_intra() {
			return (this.type == MacroblockType.Intra) || (this.type == MacroblockType.IntraQ);
		}
		has_fourvec() {
			return this.type == MacroblockType.Inter4V || this.type == MacroblockType.Inter4Vq;
		}
		has_quantizer() {
			return this.type == MacroblockType.InterQ || this.type == MacroblockType.IntraQ || this.type == MacroblockType.Inter4Vq;
		}
	}
	MacroblockType.Inter = 1;
	MacroblockType.InterQ = 2;
	MacroblockType.Inter4V = 3;
	MacroblockType.Intra = 4;
	MacroblockType.IntraQ = 5;
	MacroblockType.Inter4Vq = 6;
	class Macroblock {
		constructor(type, value) {
			this.type = type;
			this.value = value;
		}
	}
	Macroblock.Uncoded = 1;
	Macroblock.Stuffing = 2;
	Macroblock.Coded = 3;
	class BlockPatternEntry {
		constructor(type, value) {
			this.type = type;
			this.value = value;
		}
	}
	BlockPatternEntry.Stuffing = 1;
	BlockPatternEntry.Invalid = 2;
	BlockPatternEntry.Valid = 3;
	const MCBPC_I_TABLE = [new VlcEntry(VlcEntry.Fork, [2, 1]), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.Intra), false, false])), new VlcEntry(VlcEntry.Fork, [6, 3]), new VlcEntry(VlcEntry.Fork, [4, 5]), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.Intra), true, false])), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.Intra), true, true])), new VlcEntry(VlcEntry.Fork, [8, 7]), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.Intra), false, true])), new VlcEntry(VlcEntry.Fork, [10, 9]), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.IntraQ), false, false])), new VlcEntry(VlcEntry.Fork, [14, 11]), new VlcEntry(VlcEntry.Fork, [12, 13]), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.IntraQ), true, false])), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.IntraQ), true, true])), new VlcEntry(VlcEntry.Fork, [16, 20]), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Invalid)), new VlcEntry(VlcEntry.Fork, [17, 15]), new VlcEntry(VlcEntry.Fork, [18, 15]), new VlcEntry(VlcEntry.Fork, [15, 19]), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Stuffing)), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.IntraQ), false, true]))];
	const MCBPC_P_TABLE = [new VlcEntry(VlcEntry.Fork, [2, 1]), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.Inter), false, false])), new VlcEntry(VlcEntry.Fork, [6, 3]), new VlcEntry(VlcEntry.Fork, [4, 5]), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.Inter4V), false, false])), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.InterQ), false, false])), new VlcEntry(VlcEntry.Fork, [10, 7]), new VlcEntry(VlcEntry.Fork, [8, 9]), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.Inter), true, false])), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.Inter), false, true])), new VlcEntry(VlcEntry.Fork, [16, 11]), new VlcEntry(VlcEntry.Fork, [13, 12]), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.Intra), false, false])), new VlcEntry(VlcEntry.Fork, [14, 15]), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.IntraQ), false, false])), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.Inter), true, true])), new VlcEntry(VlcEntry.Fork, [24, 17]), new VlcEntry(VlcEntry.Fork, [18, 21]), new VlcEntry(VlcEntry.Fork, [19, 20]), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.Inter4V), true, false])), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.Inter4V), false, true])), new VlcEntry(VlcEntry.Fork, [22, 23]), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.InterQ), true, false])), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.InterQ), false, true])), new VlcEntry(VlcEntry.Fork, [30, 25]), new VlcEntry(VlcEntry.Fork, [27, 26]), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.Intra), true, true])), new VlcEntry(VlcEntry.Fork, [28, 29]), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.Intra), false, true])), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.Inter4V), true, true])), new VlcEntry(VlcEntry.Fork, [36, 31]), new VlcEntry(VlcEntry.Fork, [33, 32]), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.Intra), true, false])), new VlcEntry(VlcEntry.Fork, [34, 35]), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.IntraQ), false, true])), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.InterQ), true, true])), new VlcEntry(VlcEntry.Fork, [40, 37]), new VlcEntry(VlcEntry.Fork, [38, 39]), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.IntraQ), true, true])), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.IntraQ), true, false])), new VlcEntry(VlcEntry.Fork, [42, 41]), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Stuffing)), new VlcEntry(VlcEntry.Fork, [43, 44]), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Invalid)), new VlcEntry(VlcEntry.Fork, [45, 46]), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.Inter4Vq), false, false])), new VlcEntry(VlcEntry.Fork, [47, 50]), new VlcEntry(VlcEntry.Fork, [48, 49]), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.Inter4Vq), false, true])), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Invalid)), new VlcEntry(VlcEntry.Fork, [51, 52]), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.Inter4Vq), true, false])), new VlcEntry(VlcEntry.End, new BlockPatternEntry(BlockPatternEntry.Valid, [new MacroblockType(MacroblockType.Inter4Vq), true, true]))];
	const MODB_TABLE = [new VlcEntry(VlcEntry.Fork, [1, 2]), new VlcEntry(VlcEntry.End, [false, false]), new VlcEntry(VlcEntry.Fork, [3, 4]), new VlcEntry(VlcEntry.End, [false, true]), new VlcEntry(VlcEntry.End, [true, true])];
	function decode_cbpb(reader) {
		let cbp0 = reader.readBits(1) == 1;
		let cbp1 = reader.readBits(1) == 1;
		let cbp2 = reader.readBits(1) == 1;
		let cbp3 = reader.readBits(1) == 1;
		let cbp4 = reader.readBits(1) == 1;
		let cbp5 = reader.readBits(1) == 1;
		return new CodedBlockPattern([cbp0, cbp1, cbp2, cbp3], cbp4, cbp5);
	}
	const CBPY_TABLE_INTRA = [new VlcEntry(VlcEntry.Fork, [1, 24]), new VlcEntry(VlcEntry.Fork, [2, 17]), new VlcEntry(VlcEntry.Fork, [3, 12]), new VlcEntry(VlcEntry.Fork, [4, 9]), new VlcEntry(VlcEntry.Fork, [5, 6]), new VlcEntry(VlcEntry.End, null), new VlcEntry(VlcEntry.Fork, [7, 8]), new VlcEntry(VlcEntry.End, [false, true, true, false]), new VlcEntry(VlcEntry.End, [true, false, false, true]), new VlcEntry(VlcEntry.Fork, [10, 11]), new VlcEntry(VlcEntry.End, [true, false, false, false]), new VlcEntry(VlcEntry.End, [false, true, false, false]), new VlcEntry(VlcEntry.Fork, [13, 16]), new VlcEntry(VlcEntry.Fork, [14, 15]), new VlcEntry(VlcEntry.End, [false, false, true, false]), new VlcEntry(VlcEntry.End, [false, false, false, true]), new VlcEntry(VlcEntry.End, [false, false, false, false]), new VlcEntry(VlcEntry.Fork, [18, 21]), new VlcEntry(VlcEntry.Fork, [19, 20]), new VlcEntry(VlcEntry.End, [true, true, false, false]), new VlcEntry(VlcEntry.End, [true, false, true, false]), new VlcEntry(VlcEntry.Fork, [22, 23]), new VlcEntry(VlcEntry.End, [true, true, true, false]), new VlcEntry(VlcEntry.End, [false, true, false, true]), new VlcEntry(VlcEntry.Fork, [25, 32]), new VlcEntry(VlcEntry.Fork, [26, 29]), new VlcEntry(VlcEntry.Fork, [27, 28]), new VlcEntry(VlcEntry.End, [true, true, false, true]), new VlcEntry(VlcEntry.End, [false, false, true, true]), new VlcEntry(VlcEntry.Fork, [30, 31]), new VlcEntry(VlcEntry.End, [true, false, true, true]), new VlcEntry(VlcEntry.End, [false, true, true, true]), new VlcEntry(VlcEntry.End, [true, true, true, true])];
	function decode_dquant(reader) {
		switch(reader.readBits(2)) {
			case 0:
				return -1;
			case 1:
				return -2;
			case 2:
				return 1;
			case 3:
				return 2;
			default:
				throw new Error("InternalDecoderError");
		}
	}
	const MVD_TABLE = [new VlcEntry(VlcEntry.Fork, [2, 1]), new VlcEntry(VlcEntry.End, 0.0), new VlcEntry(VlcEntry.Fork, [6, 3]), new VlcEntry(VlcEntry.Fork, [4, 5]), new VlcEntry(VlcEntry.End, 0.5), new VlcEntry(VlcEntry.End, -0.5), new VlcEntry(VlcEntry.Fork, [10, 7]), new VlcEntry(VlcEntry.Fork, [8, 9]), new VlcEntry(VlcEntry.End, 1.0), new VlcEntry(VlcEntry.End, -1.0), new VlcEntry(VlcEntry.Fork, [14, 11]), new VlcEntry(VlcEntry.Fork, [12, 13]), new VlcEntry(VlcEntry.End, 1.5), new VlcEntry(VlcEntry.End, -1.5), new VlcEntry(VlcEntry.Fork, [26, 15]), new VlcEntry(VlcEntry.Fork, [19, 16]), new VlcEntry(VlcEntry.Fork, [17, 18]), new VlcEntry(VlcEntry.End, 2.0), new VlcEntry(VlcEntry.End, -2.0), new VlcEntry(VlcEntry.Fork, [23, 20]), new VlcEntry(VlcEntry.Fork, [21, 22]), new VlcEntry(VlcEntry.End, 2.5), new VlcEntry(VlcEntry.End, -2.5), new VlcEntry(VlcEntry.Fork, [24, 25]), new VlcEntry(VlcEntry.End, 3.0), new VlcEntry(VlcEntry.End, -3.0), new VlcEntry(VlcEntry.Fork, [50, 27]), new VlcEntry(VlcEntry.Fork, [31, 28]), new VlcEntry(VlcEntry.Fork, [29, 30]), new VlcEntry(VlcEntry.End, 3.5), new VlcEntry(VlcEntry.End, -3.5), new VlcEntry(VlcEntry.Fork, [39, 32]), new VlcEntry(VlcEntry.Fork, [36, 33]), new VlcEntry(VlcEntry.Fork, [34, 35]), new VlcEntry(VlcEntry.End, 4.0), new VlcEntry(VlcEntry.End, -4.0), new VlcEntry(VlcEntry.Fork, [37, 38]), new VlcEntry(VlcEntry.End, 4.5), new VlcEntry(VlcEntry.End, -4.5), new VlcEntry(VlcEntry.Fork, [43, 40]), new VlcEntry(VlcEntry.Fork, [41, 42]), new VlcEntry(VlcEntry.End, 5.0), new VlcEntry(VlcEntry.End, -5.0), new VlcEntry(VlcEntry.Fork, [47, 44]), new VlcEntry(VlcEntry.Fork, [45, 46]), new VlcEntry(VlcEntry.End, 5.5), new VlcEntry(VlcEntry.End, -5.5), new VlcEntry(VlcEntry.Fork, [48, 49]), new VlcEntry(VlcEntry.End, 6.0), new VlcEntry(VlcEntry.End, -6.0), new VlcEntry(VlcEntry.Fork, [82, 51]), new VlcEntry(VlcEntry.Fork, [67, 52]), new VlcEntry(VlcEntry.Fork, [60, 53]), new VlcEntry(VlcEntry.Fork, [57, 54]), new VlcEntry(VlcEntry.Fork, [55, 56]), new VlcEntry(VlcEntry.End, 6.5), new VlcEntry(VlcEntry.End, -6.5), new VlcEntry(VlcEntry.Fork, [58, 59]), new VlcEntry(VlcEntry.End, 7.0), new VlcEntry(VlcEntry.End, -7.0), new VlcEntry(VlcEntry.Fork, [64, 61]), new VlcEntry(VlcEntry.Fork, [62, 63]), new VlcEntry(VlcEntry.End, 7.5), new VlcEntry(VlcEntry.End, -7.5), new VlcEntry(VlcEntry.Fork, [65, 66]), new VlcEntry(VlcEntry.End, 8.0), new VlcEntry(VlcEntry.End, -8.0), new VlcEntry(VlcEntry.Fork, [75, 68]), new VlcEntry(VlcEntry.Fork, [72, 69]), new VlcEntry(VlcEntry.Fork, [70, 71]), new VlcEntry(VlcEntry.End, 8.5), new VlcEntry(VlcEntry.End, -8.5), new VlcEntry(VlcEntry.Fork, [73, 74]), new VlcEntry(VlcEntry.End, 9.0), new VlcEntry(VlcEntry.End, -9.0), new VlcEntry(VlcEntry.Fork, [79, 76]), new VlcEntry(VlcEntry.Fork, [77, 78]), new VlcEntry(VlcEntry.End, 9.5), new VlcEntry(VlcEntry.End, -9.5), new VlcEntry(VlcEntry.Fork, [80, 81]), new VlcEntry(VlcEntry.End, 10.0), new VlcEntry(VlcEntry.End, -10.0), new VlcEntry(VlcEntry.Fork, [98, 83]), new VlcEntry(VlcEntry.Fork, [91, 84]), new VlcEntry(VlcEntry.Fork, [88, 85]), new VlcEntry(VlcEntry.Fork, [86, 87]), new VlcEntry(VlcEntry.End, 10.5), new VlcEntry(VlcEntry.End, -10.5), new VlcEntry(VlcEntry.Fork, [89, 90]), new VlcEntry(VlcEntry.End, 11.0), new VlcEntry(VlcEntry.End, -11.0), new VlcEntry(VlcEntry.Fork, [95, 92]), new VlcEntry(VlcEntry.Fork, [93, 94]), new VlcEntry(VlcEntry.End, 11.5), new VlcEntry(VlcEntry.End, -11.5), new VlcEntry(VlcEntry.Fork, [96, 97]), new VlcEntry(VlcEntry.End, 12.0), new VlcEntry(VlcEntry.End, -12.0), new VlcEntry(VlcEntry.Fork, [114, 99]), new VlcEntry(VlcEntry.Fork, [107, 100]), new VlcEntry(VlcEntry.Fork, [104, 101]), new VlcEntry(VlcEntry.Fork, [102, 103]), new VlcEntry(VlcEntry.End, 12.5), new VlcEntry(VlcEntry.End, -12.5), new VlcEntry(VlcEntry.Fork, [105, 106]), new VlcEntry(VlcEntry.End, 13.0), new VlcEntry(VlcEntry.End, -13.0), new VlcEntry(VlcEntry.Fork, [111, 108]), new VlcEntry(VlcEntry.Fork, [109, 110]), new VlcEntry(VlcEntry.End, 13.5), new VlcEntry(VlcEntry.End, -13.5), new VlcEntry(VlcEntry.Fork, [112, 113]), new VlcEntry(VlcEntry.End, 14.0), new VlcEntry(VlcEntry.End, -14.0), new VlcEntry(VlcEntry.Fork, [122, 115]), new VlcEntry(VlcEntry.Fork, [119, 116]), new VlcEntry(VlcEntry.Fork, [117, 118]), new VlcEntry(VlcEntry.End, 14.5), new VlcEntry(VlcEntry.End, -14.5), new VlcEntry(VlcEntry.Fork, [120, 121]), new VlcEntry(VlcEntry.End, 15.0), new VlcEntry(VlcEntry.End, -15.0), new VlcEntry(VlcEntry.Fork, [129, 123]), new VlcEntry(VlcEntry.Fork, [127, 124]), new VlcEntry(VlcEntry.Fork, [125, 126]), new VlcEntry(VlcEntry.End, 15.5), new VlcEntry(VlcEntry.End, -15.5), new VlcEntry(VlcEntry.Fork, [129, 128]), new VlcEntry(VlcEntry.End, -16.0), new VlcEntry(VlcEntry.End, null)];
	function decode_motion_vector(reader, picture, running_options) {
		if (running_options.UNRESTRICTED_MOTION_VECTORS && picture.has_plusptype) {
			let x = reader.read_umv();
			let y = reader.read_umv();
			return new MotionVector(x, y);
		} else {
			var res_x = reader.readVLC(MVD_TABLE);
			var res_Y = reader.readVLC(MVD_TABLE);
			if (res_x === null || res_Y === null) {
				throw new Error("InvalidMvd");
			}
			let x = HalfPel.from(res_x);
			let y = HalfPel.from(res_Y);
			return new MotionVector(x, y);
		}
	}
	function decode_macroblock(reader, picture, running_options) {
		return reader.withTransaction(function(reader) {
			let is_coded = 0;
			if (picture.picture_type.type == PictureTypeCode.IFrame) {
				is_coded = 0;
			} else {
				is_coded = reader.readBits(1);
			}
			if (is_coded == 0) {
				var mcbpc = null;
				var picture_type = picture.picture_type;
				switch(picture_type.type) {
					case PictureTypeCode.IFrame:
						mcbpc = reader.readVLC(MCBPC_I_TABLE);
						break;
					case PictureTypeCode.PFrame:
						mcbpc = reader.readVLC(MCBPC_P_TABLE);
						break;
					default:
						throw new Error("UnimplementedDecoding");
				}
				var mb_type = null;
				var codes_chroma_b = null;
				var codes_chroma_r = null;
				switch(mcbpc.type) {
					case BlockPatternEntry.Stuffing:
						return new Macroblock(Macroblock.Stuffing);
					case BlockPatternEntry.Invalid:
						throw new Error("InvalidMacroblockHeader");
					case BlockPatternEntry.Valid:
						mb_type = mcbpc.value[0];
						codes_chroma_b = mcbpc.value[1];
						codes_chroma_r = mcbpc.value[2];
						break;
				}
				var has_cbpb = null;
				var has_mvdb = null;
				if (picture_type.type == PictureTypeCode.PbFrame) {
					var ergf = reader.readVLC(MODB_TABLE);
					has_cbpb = ergf[0];
					has_mvdb = ergf[1];
				} else {
					has_cbpb = false;
					has_mvdb = false;
				}
				let codes_luma = null;
				if (mb_type.is_intra()) {
					var dfgs = reader.readVLC(CBPY_TABLE_INTRA);
					if (dfgs === null) throw new Error("InvalidMacroblockCodedBits");
					codes_luma = dfgs;
				} else {
					var dfgs = reader.readVLC(CBPY_TABLE_INTRA);;
					if (dfgs === null) throw new Error("InvalidMacroblockCodedBits");
					codes_luma = [!dfgs[0], !dfgs[1], !dfgs[2], !dfgs[3]];
				}
				let coded_block_pattern_b = null;
				if (has_cbpb) {
					coded_block_pattern_b = decode_cbpb(reader);
				}
				let d_quantizer = null;
				if (running_options.MODIFIED_QUANTIZATION) {
					throw new Error("UnimplementedDecoding");
				} else if (mb_type.has_quantizer()) {
					d_quantizer = decode_dquant(reader);
				}
				let motion_vector = null;
				if (mb_type.is_inter() || picture_type.is_any_pbframe()) {
					motion_vector = decode_motion_vector(reader, picture, running_options);
				}
				let addl_motion_vectors = null;
				if (mb_type.has_fourvec()) {
					let mv2 = decode_motion_vector(reader, picture, running_options);
					let mv3 = decode_motion_vector(reader, picture, running_options);
					let mv4 = decode_motion_vector(reader, picture, running_options);
					addl_motion_vectors = [mv2, mv3, mv4];
				}
				let motion_vectors_b = null;
				if (has_mvdb) {
					let mv1 = decode_motion_vector(reader, picture, running_options);
					let mv2 = decode_motion_vector(reader, picture, running_options);
					let mv3 = decode_motion_vector(reader, picture, running_options);
					let mv4 = decode_motion_vector(reader, picture, running_options);
					motion_vectors_b = [mv1, mv2, mv3, mv4];
				}
				return new Macroblock(Macroblock.Coded, {
					mb_type,
					coded_block_pattern: {
						codes_luma,
						codes_chroma_b,
						codes_chroma_r
					},
					coded_block_pattern_b,
					d_quantizer,
					motion_vector,
					addl_motion_vectors,
					motion_vectors_b,
				});
			} else {
				return new Macroblock(Macroblock.Uncoded);
			}
		});
	}
	class ShortTCoefficient {
		constructor(type, value) {
			this.type = type;
			this.value = value;
		}
	}
	ShortTCoefficient.EscapeToLong = 1;
	ShortTCoefficient.Run = 2;
	const TCOEF_TABLE = [new VlcEntry(VlcEntry.Fork, [8, 1]),new VlcEntry(VlcEntry.Fork, [2, 3]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 0,level: 1})),new VlcEntry(VlcEntry.Fork, [4, 5]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 1,level: 1})),new VlcEntry(VlcEntry.Fork, [6, 7]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 2,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 0,level: 2})),new VlcEntry(VlcEntry.Fork, [28, 9]),new VlcEntry(VlcEntry.Fork, [15, 10]),new VlcEntry(VlcEntry.Fork, [12, 11]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 0,level: 1})),new VlcEntry(VlcEntry.Fork, [13, 14]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 4,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 3,level: 1})),new VlcEntry(VlcEntry.Fork, [16, 23]),new VlcEntry(VlcEntry.Fork, [17, 20]),new VlcEntry(VlcEntry.Fork, [18, 19]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 9,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 8,level: 1})),new VlcEntry(VlcEntry.Fork, [21, 22]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 7,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 6,level: 1})),new VlcEntry(VlcEntry.Fork, [25, 24]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 5,level: 1})),new VlcEntry(VlcEntry.Fork, [26, 27]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 1,level: 2})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 0,level: 3})),new VlcEntry(VlcEntry.Fork, [52, 29]),new VlcEntry(VlcEntry.Fork, [37, 30]),new VlcEntry(VlcEntry.Fork, [31, 34]),new VlcEntry(VlcEntry.Fork, [32, 33]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 4,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 3,level: 1})),new VlcEntry(VlcEntry.Fork, [35, 36]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 2,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 1,level: 1})),new VlcEntry(VlcEntry.Fork, [38, 45]),new VlcEntry(VlcEntry.Fork, [39, 42]),new VlcEntry(VlcEntry.Fork, [40, 41]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 8,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 7,level: 1})),new VlcEntry(VlcEntry.Fork, [43, 44]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 6,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 5,level: 1})),new VlcEntry(VlcEntry.Fork, [46, 49]),new VlcEntry(VlcEntry.Fork, [47, 48]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 12,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 11,level: 1})),new VlcEntry(VlcEntry.Fork, [50, 51]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 10,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 0,level: 4})),new VlcEntry(VlcEntry.Fork, [90, 53]),new VlcEntry(VlcEntry.Fork, [69, 54]),new VlcEntry(VlcEntry.Fork, [55, 62]),new VlcEntry(VlcEntry.Fork, [56, 59]),new VlcEntry(VlcEntry.Fork, [57, 58]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 11,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 10,level: 1})),new VlcEntry(VlcEntry.Fork, [60, 61]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 9,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 14,level: 1})),new VlcEntry(VlcEntry.Fork, [63, 66]),new VlcEntry(VlcEntry.Fork, [64, 65]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 13,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 2,level: 2})),new VlcEntry(VlcEntry.Fork, [67, 68]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 1,level: 3})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 0,level: 5})),new VlcEntry(VlcEntry.Fork, [77, 70]),new VlcEntry(VlcEntry.Fork, [71, 74]),new VlcEntry(VlcEntry.Fork, [72, 73]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 15,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 14,level: 1})),new VlcEntry(VlcEntry.Fork, [75, 76]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 13,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 12,level: 1})),new VlcEntry(VlcEntry.Fork, [78, 85]),new VlcEntry(VlcEntry.Fork, [79, 82]),new VlcEntry(VlcEntry.Fork, [80, 81]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 16,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 15,level: 1})),new VlcEntry(VlcEntry.Fork, [83, 84]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 4,level: 2})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 3,level: 2})),new VlcEntry(VlcEntry.Fork, [86, 89]),new VlcEntry(VlcEntry.Fork, [87, 88]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 0,level: 7})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 0,level: 6})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 16,level: 1})),new VlcEntry(VlcEntry.Fork, [124, 91]),new VlcEntry(VlcEntry.Fork, [92, 109]),new VlcEntry(VlcEntry.Fork, [93, 102]),new VlcEntry(VlcEntry.Fork, [94, 99]),new VlcEntry(VlcEntry.Fork, [95, 98]),new VlcEntry(VlcEntry.Fork, [96, 97]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 0,level: 9})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 0,level: 8})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 24,level: 1})),new VlcEntry(VlcEntry.Fork, [100, 101]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 23,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 22,level: 1})),new VlcEntry(VlcEntry.Fork, [103, 106]),new VlcEntry(VlcEntry.Fork, [104, 105]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 21,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 20,level: 1})),new VlcEntry(VlcEntry.Fork, [107, 108]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 19,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 18,level: 1})),new VlcEntry(VlcEntry.Fork, [110, 117]),new VlcEntry(VlcEntry.Fork, [111, 114]),new VlcEntry(VlcEntry.Fork, [112, 113]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 17,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 0,level: 2})),new VlcEntry(VlcEntry.Fork, [115, 116]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 22,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 21,level: 1})),new VlcEntry(VlcEntry.Fork, [118, 121]),new VlcEntry(VlcEntry.Fork, [119, 120]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 20,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 19,level: 1})),new VlcEntry(VlcEntry.Fork, [122, 123]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 18,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 17,level: 1})),new VlcEntry(VlcEntry.Fork, [174, 125]),new VlcEntry(VlcEntry.Fork, [127, 126]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.EscapeToLong)),new VlcEntry(VlcEntry.Fork, [128, 143]),new VlcEntry(VlcEntry.Fork, [129, 136]),new VlcEntry(VlcEntry.Fork, [130, 133]),new VlcEntry(VlcEntry.Fork, [131, 132]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 0,level: 12})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 1,level: 5})),new VlcEntry(VlcEntry.Fork, [134, 135]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 23,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 24,level: 1})),new VlcEntry(VlcEntry.Fork, [137, 140]),new VlcEntry(VlcEntry.Fork, [138, 139]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 29,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 30,level: 1})),new VlcEntry(VlcEntry.Fork, [141, 142]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 31,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 32,level: 1})),new VlcEntry(VlcEntry.Fork, [144, 159]),new VlcEntry(VlcEntry.Fork, [145, 152]),new VlcEntry(VlcEntry.Fork, [146, 149]),new VlcEntry(VlcEntry.Fork, [147, 148]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 1,level: 6})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 2,level: 4})),new VlcEntry(VlcEntry.Fork, [150, 151]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 4,level: 3})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 5,level: 3})),new VlcEntry(VlcEntry.Fork, [153, 156]),new VlcEntry(VlcEntry.Fork, [154, 155]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 6,level: 3})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 10,level: 2})),new VlcEntry(VlcEntry.Fork, [157, 158]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 25,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 26,level: 1})),new VlcEntry(VlcEntry.Fork, [160, 167]),new VlcEntry(VlcEntry.Fork, [161, 164]),new VlcEntry(VlcEntry.Fork, [162, 163]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 33,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 34,level: 1})),new VlcEntry(VlcEntry.Fork, [165, 166]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 35,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 36,level: 1})),new VlcEntry(VlcEntry.Fork, [168, 171]),new VlcEntry(VlcEntry.Fork, [169, 170]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 37,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 38,level: 1})),new VlcEntry(VlcEntry.Fork, [172, 173]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 39,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 40,level: 1})),new VlcEntry(VlcEntry.Fork, [190, 175]),new VlcEntry(VlcEntry.Fork, [176, 183]),new VlcEntry(VlcEntry.Fork, [177, 180]),new VlcEntry(VlcEntry.Fork, [178, 179]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 9,level: 2})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 8,level: 2})),new VlcEntry(VlcEntry.Fork, [181, 182]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 7,level: 2})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 6,level: 2})),new VlcEntry(VlcEntry.Fork, [184, 187]),new VlcEntry(VlcEntry.Fork, [185, 186]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 5,level: 2})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 3,level: 3})),new VlcEntry(VlcEntry.Fork, [188, 189]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 2,level: 3})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 1,level: 4})),new VlcEntry(VlcEntry.Fork, [198, 191]),new VlcEntry(VlcEntry.Fork, [192, 195]),new VlcEntry(VlcEntry.Fork, [193, 194]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 28,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 27,level: 1})),new VlcEntry(VlcEntry.Fork, [196, 197]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 26,level: 1})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 25,level: 1})),new VlcEntry(VlcEntry.Fork, [206, 199]),new VlcEntry(VlcEntry.Fork, [200, 203]),new VlcEntry(VlcEntry.Fork, [201, 202]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 1,level: 2})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: true,run: 0,level: 3})),new VlcEntry(VlcEntry.Fork, [204, 205]),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 0,level: 11})),new VlcEntry(VlcEntry.End, new ShortTCoefficient(ShortTCoefficient.Run, {last: false,run: 0,level: 10})),new VlcEntry(VlcEntry.End, null)];
	function decode_block(reader, decoder_options, picture, running_options, macroblock_type, tcoef_present) {
		return reader.withTransaction(function(reader) {
			let intradc = null;
			if (macroblock_type.is_intra()) {
				intradc = IntraDc.from_u8(reader.readUint8());
				if (intradc === null) 
					throw new Error("InvalidIntraDc");
			}
			var tcoef = [];
			while(tcoef_present) {
				let short_tcoef = reader.readVLC(TCOEF_TABLE);
				if (short_tcoef === null) 
					throw new Error("InvalidShortCoefficient");
				switch(short_tcoef.type) {
					case ShortTCoefficient.EscapeToLong:
						let level_width = null;
						if (decoder_options.sorensonSpark && (picture.version == 1)) {
							if (reader.readBits(1) == 1) {
								level_width = 11;
							} else {
								level_width = 7;
							}
						} else {
							level_width = 8;
						}
						let last = reader.readBits(1) == 1;
						let run = reader.readBits(6);
						let level = reader.readSignedBits(level_width);
						if (level == 0) {
							throw new Error("InvalidLongCoefficient");
						}
						tcoef.push(new TCoefficient(false, run, level));
						tcoef_present = !last;
						break;
					case ShortTCoefficient.Run:
						var res = short_tcoef.value;
						let sign = reader.readBits(1);
						if (sign == 0) {
							tcoef.push(new TCoefficient(true, res.run, res.level));
						} else {
							tcoef.push(new TCoefficient(true, res.run, -res.level));
						}
						tcoef_present = !res.last;
						break;
				}  
			}
			return new Block(intradc, tcoef);
		});
	}
	const DEZIGZAG_MAPPING = [[0, 0], [1, 0], [0, 1], [0, 2], [1, 1], [2, 0], [3, 0], [2, 1], [1, 2], [0, 3], [0, 4], [1, 3], [2, 2], [3, 1], [4, 0], [5, 0], [4, 1], [3, 2], [2, 3], [1, 4], [0, 5], [0, 6], [1, 5], [2, 4], [3, 3], [4, 2], [5, 1], [6, 0], [7, 0], [6, 1], [5, 2], [4, 3], [3, 4], [2, 5], [1, 6], [0, 7], [1, 7], [2, 6], [3, 5], [4, 4], [5, 3], [6, 2], [7, 1], [7, 2], [6, 3], [5, 4], [4, 5], [3, 6], [2, 7], [3, 7], [4, 6], [5, 5], [6, 4], [7, 3], [7, 4], [6, 5], [5, 6], [4, 7], [5, 7], [6, 6], [7, 5], [7, 6], [6, 7], [7, 7]]
	function inverse_rle(encoded_block, levels, pos, blk_per_line, quant) {
		let block_id = asI32(pos[0] / 8) + (asI32(pos[1] / 8) * blk_per_line);
		if (encoded_block.tcoef.length == 0) {
			if (encoded_block.intradc) {
				let dc_level = encoded_block.intradc.into_level();
				if (dc_level == 0) {
					levels[block_id] = new DecodedDctBlock(DecodedDctBlock.Zero);
				} else {
					levels[block_id] = new DecodedDctBlock(DecodedDctBlock.Dc, dc_level);
				}
			} else {
				levels[block_id] = new DecodedDctBlock(DecodedDctBlock.Zero);
			}
		} else {
			var block_data = [new Float32Array(8), new Float32Array(8), new Float32Array(8), new Float32Array(8), new Float32Array(8), new Float32Array(8), new Float32Array(8), new Float32Array(8)];
			let is_horiz = true;
			let is_vert = true;
			let zigzag_index = 0;
			if (encoded_block.intradc) {
				block_data[0][0] = encoded_block.intradc.into_level();
				zigzag_index += 1;
			}
			for (var i = 0; i < encoded_block.tcoef.length; i++) {
				var tcoef = encoded_block.tcoef[i];
				zigzag_index += tcoef.run;
				if (zigzag_index >= DEZIGZAG_MAPPING.length) return;
				let [zig_x, zig_y] = DEZIGZAG_MAPPING[zigzag_index];
				let dequantized_level = asI16(quant) * ((2 * Math.abs(tcoef.level)) + 1);
				let parity = null;
				if (quant % 2 == 1) {
					parity = 0;
				} else {
					parity = -1;
				}
				let val = Math.max(Math.min(num_signum(tcoef.level) * (dequantized_level + parity), 2047), -2048);
				block_data[zig_y][zig_x] = val;
				zigzag_index += 1;
				if (val != 0.0) {
					if (zig_y > 0) {
						is_horiz = false;
					}
					if (zig_x > 0) {
						is_vert = false;
					}
				}
			}
			if ((is_horiz == true) && (is_vert == true)) {
				if (block_data[0][0] == 0) {
					levels[block_id] = new DecodedDctBlock(DecodedDctBlock.Zero);
				} else {
					levels[block_id] = new DecodedDctBlock(DecodedDctBlock.Dc, block_data[0][0]);
				}
			} else if ((is_horiz == true) && (is_vert == false)) {
				levels[block_id] = new DecodedDctBlock(DecodedDctBlock.Horiz, block_data[0]);
			} else if ((is_horiz == false) && (is_vert == true)) {
				var r = new Float32Array(8);
				r[0] = block_data[0][0];
				r[1] = block_data[1][0];
				r[2] = block_data[2][0];
				r[3] = block_data[3][0];
				r[4] = block_data[4][0];
				r[5] = block_data[5][0];
				r[6] = block_data[6][0];
				r[7] = block_data[7][0];
				levels[block_id] = new DecodedDctBlock(DecodedDctBlock.Vert, r);
			} else if ((is_horiz == false) && (is_vert == false)) {
				levels[block_id] = new DecodedDctBlock(DecodedDctBlock.Full, block_data);
			}
		}
	}
	function read_sample(pixel_array, samples_per_row, num_rows, pos) {
		let [x, y] = pos;
		let _x = num_clamp(x, 0, samples_per_row - 1);
		let _y = num_clamp(y, 0, num_rows - 1);
		return pixel_array[_x + (_y * samples_per_row)];
	}
	function lerp(sample_a, sample_b, middle) {
		if (middle) {
			return asU8((sample_a + sample_b + 1) / 2);
		} else {
			return asU8(sample_a);
		}
	}
	function gather_block(pixel_array, samples_per_row, pos, mv, target) {
		var g = mv.into_lerp_parameters();
		let [x_delta, x_interp] = g[0];
		let [y_delta, y_interp] = g[1];
		let src_x = asI32(pos[0] + x_delta);
		let src_y = asI32(pos[1] + y_delta);
		let array_height = asI32(pixel_array.length / samples_per_row);
		let block_cols = num_clamp((samples_per_row - pos[0]), 0, 8);
		let block_rows = num_clamp((array_height - pos[1]), 0, 8);
		if (!x_interp && !y_interp) {
			if (block_cols == 8 && block_rows == 8 && asfgdgdfg(src_x, 0, samples_per_row - 8) && asfgdgdfg(src_y, 0, array_height - 8)) {
				for (var j = 0; j < 8; j++) {
					let src_offset = src_x + ((src_y + j) * samples_per_row);
					let dest_offset = pos[0] + (pos[1] + j) * samples_per_row;
					for (var _ = 0; _ < 8; _++) {
						target[dest_offset + _] = pixel_array[src_offset + _];
					}
				}
			} else {
				for (var _j = 0; _j < block_rows; _j += 1) {
					var j = _j;
					var v = _j + src_y;
					for (var _i = 0; _i < block_cols; _i += 1) {
						var i = _i;
						var u = _i + src_x;
						target[pos[0] + i + ((pos[1] + j) * samples_per_row)] = read_sample(pixel_array, samples_per_row, array_height, [u, v]);
					}
				}
			}
		} else {
			for (var _j = 0; _j < block_rows; _j += 1) {
				var j = _j;
				var v = _j + src_y;
				for (var _i = 0; _i < block_cols; _i += 1) {
					var i = _i;
					var u = _i + src_x;
					let sample_0_0 = read_sample(pixel_array, samples_per_row, array_height, [u, v]);
					let sample_1_0 = read_sample(pixel_array, samples_per_row, array_height, [u + 1, v]);
					let sample_0_1 = read_sample(pixel_array, samples_per_row, array_height, [u, v + 1]);
					let sample_1_1 = read_sample(pixel_array, samples_per_row, array_height, [u + 1, v + 1]);
					if (x_interp && y_interp) {
						let sample = asU8((sample_0_0 + sample_1_0 + sample_0_1 + sample_1_1 + 2) / 4);
						target[pos[0] + i + ((pos[1] + j) * samples_per_row)] = sample;
					} else {
						let sample_mid_0 = lerp(sample_0_0, sample_1_0, x_interp);
						let sample_mid_1 = lerp(sample_0_1, sample_1_1, x_interp);
						target[pos[0] + i + ((pos[1] + j) * samples_per_row)] = lerp(sample_mid_0, sample_mid_1, y_interp);
					}
				}
			}
		}
	}
	function gather(mb_types, reference_picture, mvs, mb_per_line, new_picture) {
		for (var i = 0; i < mb_types.length; i++) {
			var mb_type = mb_types[i];
			var mv = mvs[i];
			if (mb_type.is_inter()) {
				if (!reference_picture)
					throw new Error("UncodedIFrameBlocks");
				let luma_samples_per_row = reference_picture.luma_samples_per_row();
				let pos = [
					Math.floor(i % mb_per_line) * 16,
					Math.floor(i / mb_per_line) * 16
				];
				gather_block(reference_picture.as_luma(), luma_samples_per_row, pos, mv[0], new_picture.as_luma_mut());
				gather_block(reference_picture.as_luma(), luma_samples_per_row, [pos[0] + 8, pos[1]], mv[1], new_picture.as_luma_mut());
				gather_block(reference_picture.as_luma(), luma_samples_per_row, [pos[0], pos[1] + 8], mv[2], new_picture.as_luma_mut());
				gather_block(reference_picture.as_luma(), luma_samples_per_row, [pos[0] + 8, pos[1] + 8], mv[3], new_picture.as_luma_mut());
				let mv_chr = mv[0].add(mv[1].add(mv[2].add(mv[3]))).average_sum_of_mvs();
				let chroma_samples_per_row = reference_picture.chroma_samples_per_row;
				let chroma_pos = [Math.floor(i % mb_per_line) * 8, Math.floor(i / mb_per_line) * 8];
				gather_block(reference_picture.as_chroma_b(), chroma_samples_per_row, [chroma_pos[0], chroma_pos[1]], mv_chr, new_picture.as_chroma_b_mut());
				gather_block(reference_picture.as_chroma_r(), chroma_samples_per_row, [chroma_pos[0], chroma_pos[1]], mv_chr, new_picture.as_chroma_r_mut());
			}
		}
	}
	const BASIS_TABLE = [new Float32Array([0.70710677, 0.70710677, 0.70710677, 0.70710677, 0.70710677, 0.70710677, 0.70710677, 0.70710677]), new Float32Array([0.98078525, 0.8314696, 0.5555702, 0.19509023, -0.19509032, -0.55557036, -0.83146966, -0.9807853]), new Float32Array([0.9238795, 0.38268343, -0.38268352, -0.9238796, -0.9238795, -0.38268313, 0.3826836, 0.92387956]), new Float32Array([0.8314696, -0.19509032, -0.9807853, -0.55557, 0.55557007, 0.98078525, 0.19509007, -0.8314698]), new Float32Array([0.70710677, -0.70710677, -0.70710665, 0.707107, 0.70710677, -0.70710725, -0.70710653,  0.7071068]), new Float32Array([0.5555702, -0.9807853, 0.19509041, 0.83146936, -0.8314698, -0.19508928, 0.9807853, -0.55557007]), new Float32Array([0.38268343, -0.9238795, 0.92387974, -0.3826839, -0.38268384, 0.9238793, -0.92387974,  0.3826839]), new Float32Array([0.19509023, -0.55557, 0.83146936, -0.9807852, 0.98078525, -0.83147013, 0.55557114, -0.19508967])];
	function idct_1d(input, output) {
		output.fill(0);
		for (var i = 0; i < output.length; i++) {
			for (var freq = 0; freq < 8; freq++) {
				output[i] += input[freq] * BASIS_TABLE[freq][i];
			}
		}
	}
	function idct_channel(block_levels, output, blk_per_line, output_samples_per_line) {
		let output_height = asI32(output.length / output_samples_per_line);
		let blk_height = asI32(block_levels.length / blk_per_line);
		let idct_intermediate = [new Float32Array(8), new Float32Array(8), new Float32Array(8), new Float32Array(8), new Float32Array(8), new Float32Array(8), new Float32Array(8), new Float32Array(8)];
		let idct_output = [new Float32Array(8), new Float32Array(8), new Float32Array(8), new Float32Array(8), new Float32Array(8), new Float32Array(8), new Float32Array(8), new Float32Array(8)];
		for (var y_base = 0; y_base < blk_height; y_base++) {
			for (var x_base = 0; x_base < blk_per_line; x_base++) {
				let block_id = x_base + (y_base * blk_per_line);
				if (block_id >= block_levels.length) 
					continue;
				let xs = num_clamp((output_samples_per_line - x_base * 8), 0, 8);
				let ys = num_clamp((output_height - y_base * 8), 0, 8);
				var b = block_levels[block_id];
				switch(b.type) {
					case DecodedDctBlock.Zero:
						break;
					case DecodedDctBlock.Dc:
						var dc = b.value;
						let clipped_idct = num_clamp(asI16((dc * 0.5 / 4.0 + num_signum(dc) * 0.5)), -256, 255);
						for (var y_offset = 0; y_offset < ys; y_offset++) {
							for (var x_offset = 0; x_offset < xs; x_offset++) {
								let x = x_base * 8 + x_offset;
								let y = y_base * 8 + y_offset;
								let mocomp_pixel = asI16(output[x + (y * output_samples_per_line)]);
								output[x + (y * output_samples_per_line)] = asU8(num_clamp(clipped_idct + mocomp_pixel, 0, 255));
							}
						}
						break;
					case DecodedDctBlock.Horiz:
						var first_row = b.value;
						idct_1d(first_row, idct_intermediate[0]);
						for (var y_offset = 0; y_offset < ys; y_offset++) {
							var _idcts = idct_intermediate[0];
							for (var x_offset = 0; x_offset < xs; x_offset++) {
								var idct = _idcts[x_offset];
								let x = x_base * 8 + x_offset;
								let y = y_base * 8 + y_offset;
								let clipped_idct = num_clamp((asI16(idct * BASIS_TABLE[0][0] / 4.0 + num_signum(idct) * 0.5)), -256, 255);
								let mocomp_pixel = asI16(output[x + (y * output_samples_per_line)]);
								output[x + (y * output_samples_per_line)] = asU8(num_clamp((clipped_idct + mocomp_pixel), 0, 255));
							}
						}
						break;
					case DecodedDctBlock.Vert:
						var first_col = b.value;
						idct_1d(first_col, idct_intermediate[0]);
						var _idcts = idct_intermediate[0];
						for (var y_offset = 0; y_offset < ys; y_offset++) {
							var idct = _idcts[y_offset];
							for (var x_offset = 0; x_offset < xs; x_offset++) {
								let x = x_base * 8 + x_offset;
								let y = y_base * 8 + y_offset;
								let clipped_idct = num_clamp((asI16(idct * BASIS_TABLE[0][0] / 4.0 + num_signum(idct) * 0.5)), -256, 255);
								let mocomp_pixel = asI16(output[x + (y * output_samples_per_line)]);
								output[x + (y * output_samples_per_line)] = asU8(num_clamp((clipped_idct + mocomp_pixel), 0, 255));
							}
						}
						break;
					case DecodedDctBlock.Full:
						var block_data = b.value;
						for (var row = 0; row < 8; row++) {
							idct_1d(block_data[row], idct_output[row]);
							for (var i = 0; i < idct_intermediate.length; i++) {
								idct_intermediate[i][row] = idct_output[row][i];
							}
						}
						for (var row = 0; row < 8; row++) {
							idct_1d(idct_intermediate[row], idct_output[row]);
						}
						for (var x_offset = 0; x_offset < xs; x_offset++) {
							var idct_row = idct_output[x_offset];
							for (var y_offset = 0; y_offset < ys; y_offset++) {
								var idct = idct_row[y_offset];
								let x = x_base * 8 + x_offset;
								let y = y_base * 8 + y_offset;
								let clipped_idct = num_clamp((asI16(idct / 4.0 + num_signum(idct) * 0.5)), -256, 255);
								let mocomp_pixel = asI16(output[x + (y * output_samples_per_line)]);
								output[x + (y * output_samples_per_line)] = asU8(num_clamp((clipped_idct + mocomp_pixel), 0, 255));
							}
						}
						break;
				}
			}
		}
	}
	function predict_candidate(predictor_vectors, current_predictors, mb_per_line, index) {
		let current_mb = predictor_vectors.length;
		let col_index = current_mb % mb_per_line;
		let mv1_pred = null;
		switch(index) {
			case 0:
			case 2:
				if (col_index == 0) {
					mv1_pred = MotionVector.zero();
				} else {
					mv1_pred = predictor_vectors[current_mb - 1][index + 1];
				}
				break;
			case 1:
			case 3:
				mv1_pred = current_predictors[index - 1];
				break;
			default:
				throw new Error("unreachable");
		}
		let line_index = asI32(current_mb / mb_per_line);
		let last_line_mb = (saturatingSub(line_index, 1) * mb_per_line) + col_index;
		let mv2_pred = null;
		switch(index) {
			case 0:
			case 1:
				if (line_index == 0) {
					mv2_pred = mv1_pred;
				} else {
					var r = predictor_vectors[last_line_mb];
					if (r) {
						mv2_pred = r[index + 2];
					} else {
						mv2_pred = mv1_pred;
					}
				}
				break;
			case 2:
			case 3:
				mv2_pred = current_predictors[0];
				break;
			default:
				throw new Error("unreachable");
		}
		let is_end_of_line = col_index == saturatingSub(mb_per_line, 1);
		let mv3_pred = null;
		switch(index) {
			case 0:
			case 1:
				if (is_end_of_line) {
					mv3_pred = MotionVector.zero();
				} else {
					if (line_index == 0) {
						mv3_pred = mv1_pred;
					} else {
						var r = predictor_vectors[last_line_mb + 1];
						if (r) {
							mv3_pred = r[2];
						} else {
							mv3_pred = mv1_pred;
						}
					}
				}
				break;
			case 2:
			case 3:
				mv3_pred = current_predictors[1];
				break;
			default:
				throw new Error("unreachable");
		}
		return mv1_pred.median_of(mv2_pred, mv3_pred);
	}
	function halfpel_decode(current_picture, running_options, predictor, mvd, is_x) {
		let range = HalfPel.STANDARD_RANGE;
		let out = new HalfPel(asI16(mvd.n + predictor.n));
		if (!out.is_mv_within_range(range)) {
			out = new HalfPel(asI16(mvd.invert().n + predictor.n));
		}
		return out;
	}
	function mv_decode(current_picture, running_options, predictor, mvd) {
		let mvx = mvd.n1;
		let mvy = mvd.n2;
		let cpx = predictor.n1;
		let cpy = predictor.n2;
		let out_x = halfpel_decode(current_picture, running_options, cpx, mvx, true);
		let out_y = halfpel_decode(current_picture, running_options, cpy, mvy, false);
		return new MotionVector(out_x, out_y);
	}
	class H263State {
		constructor(decoderOptions) {
			this.decoderOptions = decoderOptions;
			this.last_picture = null;
			this.reference_picture = null;
			this.running_options = PictureOption.empty();
			this.reference_states = new Map();
		}
		isSorenson() {
			return this.decoderOptions.sorensonSpark;
		}
		getLastPicture() {
			if (this.last_picture === null) {
				return null;
			} else {
				return this.reference_states.get(this.last_picture);
			}
		}
		getReferencePicture() {
			if (this.reference_picture === null) {
				return null;
			} else {
				return this.reference_states.get(this.reference_picture);
			}
		}
		cleanup_buffers() {
			var r1 = this.last_picture;
			let last_picture = this.reference_states.get(r1);
			this.reference_states = new Map();
			if (last_picture) {
				this.reference_states.set(r1, last_picture);
			}
		}
		parsePicture(reader, previous_picture) {
			return decodePicture(reader, this.decoderOptions, previous_picture);
		}
		decodeNextPicture(reader) {
			let next_picture = this.parsePicture(reader, this.getLastPicture());
			var next_running_options = next_picture.options;
			let format = null;
			if (next_picture.format) {
				format = next_picture.format;
			} else if (next_picture.picture_type.type == PictureTypeCode.IFrame) {
				throw new Error("PictureFormatMissing");
			} else {
				var ref_format = null;
				var rfgh = this.getLastPicture();
				if (rfgh !== null) {
					ref_format = rfgh.format;
				} else {
					throw new Error("PictureFormatMissing");
				}
				format = ref_format;
			}
			let reference_picture = this.getReferencePicture();
			let output_dimensions = format.intoWidthAndHeight();
			let mb_per_line = Math.ceil(output_dimensions[0] / 16.0);
			let mb_height = Math.ceil(output_dimensions[1] / 16.0);
			let level_dimensions = [mb_per_line * 16, mb_height * 16];
			let in_force_quantizer = next_picture.quantizer;
			var MAX_L = mb_per_line * mb_height;
			let predictor_vectors = [];
			let macroblock_types = [];
			let next_decoded_picture = new DecodedPicture(next_picture, format);
			var luma_levels = new Array(level_dimensions[0] * level_dimensions[1] / 64);
			var chroma_b_levels = new Array(level_dimensions[0] * level_dimensions[1] / 4 / 64);
			var chroma_r_levels = new Array(level_dimensions[0] * level_dimensions[1] / 4 / 64);
			for (var i = 0; i < luma_levels.length; i++)
				luma_levels[i] = new DecodedDctBlock(DecodedDctBlock.Zero);
			for (var i = 0; i < chroma_b_levels.length; i++)
				chroma_b_levels[i] = new DecodedDctBlock(DecodedDctBlock.Zero);
			for (var i = 0; i < chroma_r_levels.length; i++)
				chroma_r_levels[i] = new DecodedDctBlock(DecodedDctBlock.Zero);
			while ((reader.bitAva() > 0) && (macroblock_types.length < MAX_L)) {
				let mb;
				try {
					mb = decode_macroblock(reader, next_decoded_picture.as_header(), next_running_options);
				} catch (e) {
					mb = e.message;
				}
				let pos = [
					Math.floor(macroblock_types.length % mb_per_line) * 16,
					Math.floor(macroblock_types.length / mb_per_line) * 16
				];
				let motion_vectors = [MotionVector.zero(), MotionVector.zero(), MotionVector.zero(), MotionVector.zero()];
				var mb_type = null;
				var isStuffing = false;
				if (typeof mb == "string") {
					if (is_eof_error(mb)) {
						break;
					} else {
						throw new Error(mb);
					}
				} else {
					switch (mb.type) {
						case Macroblock.Stuffing:
							isStuffing = true;
							break;
						case Macroblock.Uncoded:
							if (next_decoded_picture.as_header().picture_type.type == PictureTypeCode.IFrame) throw new Error("UncodedIFrameBlocks");
							mb_type = new MacroblockType(MacroblockType.Inter);
							break;
						case Macroblock.Coded:
							var res = mb.value;
							let quantizer = asI8(asI8(in_force_quantizer) + ((res.d_quantizer === null) ? 0 : res.d_quantizer));
							in_force_quantizer = asU8(num_clamp(quantizer, 1, 31));
							if (res.mb_type.is_inter()) {
								let mv1 = res.motion_vector;
								if (mv1 === null) mv1 = MotionVector.zero();
								let mpred1 = predict_candidate(predictor_vectors, motion_vectors, mb_per_line, 0);
								motion_vectors[0] = mv_decode(next_decoded_picture, next_running_options, mpred1, mv1);
								var addl_motion_vectors = res.addl_motion_vectors;
								if (addl_motion_vectors) {
									let mpred2 = predict_candidate(predictor_vectors, motion_vectors, mb_per_line, 1);
									motion_vectors[1] = mv_decode(next_decoded_picture, next_running_options, mpred2, addl_motion_vectors[0]);
									let mpred3 = predict_candidate(predictor_vectors, motion_vectors, mb_per_line, 2);
									motion_vectors[2] = mv_decode(next_decoded_picture, next_running_options, mpred3, addl_motion_vectors[1]);
									let mpred4 = predict_candidate(predictor_vectors, motion_vectors, mb_per_line, 3);
									motion_vectors[3] = mv_decode(next_decoded_picture, next_running_options, mpred4, addl_motion_vectors[2]);
								} else {
									motion_vectors[1] = motion_vectors[0];
									motion_vectors[2] = motion_vectors[0];
									motion_vectors[3] = motion_vectors[0];
								};
							}
							let luma0 = decode_block(reader, this.decoderOptions, next_decoded_picture.as_header(), next_running_options, res.mb_type, res.coded_block_pattern.codes_luma[0]);
							inverse_rle(luma0, luma_levels, pos, level_dimensions[0] / 8, in_force_quantizer);
							let luma1 = decode_block(reader, this.decoderOptions, next_decoded_picture.as_header(), next_running_options, res.mb_type, res.coded_block_pattern.codes_luma[1]);
							inverse_rle(luma1, luma_levels, [pos[0] + 8, pos[1]], level_dimensions[0] / 8, in_force_quantizer);
							let luma2 = decode_block(reader, this.decoderOptions, next_decoded_picture.as_header(), next_running_options, res.mb_type, res.coded_block_pattern.codes_luma[2]);
							inverse_rle(luma2, luma_levels, [pos[0], pos[1] + 8], level_dimensions[0] / 8, in_force_quantizer);
							let luma3 = decode_block(reader, this.decoderOptions, next_decoded_picture.as_header(), next_running_options, res.mb_type, res.coded_block_pattern.codes_luma[3]);
							inverse_rle(luma3, luma_levels, [pos[0] + 8, pos[1] + 8], level_dimensions[0] / 8, in_force_quantizer);
							let chroma_b = decode_block(reader, this.decoderOptions, next_decoded_picture.as_header(), next_running_options, res.mb_type, res.coded_block_pattern.codes_chroma_b);
							inverse_rle(chroma_b, chroma_b_levels, [pos[0] / 2, pos[1] / 2], mb_per_line, in_force_quantizer);
							let chroma_r = decode_block(reader, this.decoderOptions, next_decoded_picture.as_header(), next_running_options, res.mb_type, res.coded_block_pattern.codes_chroma_r);
							inverse_rle(chroma_r, chroma_r_levels, [pos[0] / 2, pos[1] / 2], mb_per_line, in_force_quantizer);
							mb_type = res.mb_type;
							break;
					}
					if (isStuffing) continue;
				}
				predictor_vectors.push(motion_vectors);
				macroblock_types.push(mb_type);
			}
			while (predictor_vectors.length < MAX_L) predictor_vectors.push(MotionVector.zero());
			while (macroblock_types.length < MAX_L) macroblock_types.push(new MacroblockType(MacroblockType.Inter));
			gather(macroblock_types, reference_picture, predictor_vectors, mb_per_line, next_decoded_picture);
			idct_channel(luma_levels, next_decoded_picture.as_luma_mut(), mb_per_line * 2, (output_dimensions[0]));
			let chroma_samples_per_row = next_decoded_picture.chroma_samples_per_row;
			idct_channel(chroma_b_levels, next_decoded_picture.as_chroma_b_mut(), mb_per_line, chroma_samples_per_row);
			idct_channel(chroma_r_levels, next_decoded_picture.as_chroma_r_mut(), mb_per_line, chroma_samples_per_row);
			if (next_decoded_picture.as_header().picture_type.type == PictureTypeCode.IFrame) this.reference_picture = null;
			let this_tr = next_decoded_picture.as_header().temporal_reference;
			this.last_picture = this_tr;
			if (!next_decoded_picture.as_header().picture_type.is_disposable()) this.reference_picture = this_tr;
			this.reference_states.set(this_tr, next_decoded_picture);
			this.cleanup_buffers();
		}
	}
	class H263Reader {
		constructor(source) {
			this.source = source;
			this.bitsRead = 0;
		}
		readBits(bitsNeeded) {
			let r = this.peekBits(bitsNeeded);
			this.skipBits(bitsNeeded);
			return r;
		}
		readSignedBits(bitsNeeded) {
			let uval = this.readBits(bitsNeeded);
			var shift = 32 - bitsNeeded;
			return (uval << shift) >> shift;
		}
		peekBits(bitsNeeded) {
			if (bitsNeeded == 0) return 0;
			let accum = 0;
			var i = bitsNeeded;
			let last_bits_read = this.bitsRead;
			while (i--) {
				if (bitsNeeded == 0)
					break;
				let bytes_read = Math.floor(this.bitsRead / 8);
				let bits_read = (this.bitsRead % 8);
				if (bytes_read >= this.source.length) {
					throw new Error("EndOfFile");
				}
				let byte = this.source[bytes_read];
				accum <<= 1;
				accum |= ((byte >> (7 - bits_read)) & 0x1);
				this.bitsRead++;
			}

			this.bitsRead = last_bits_read;

			return accum;
		}
		skipBits(bits_to_skip) {
			this.bitsRead += bits_to_skip;
		}
		readUint8() {
			return this.readBits(8);
		}
		recognizeStartCode(in_error) {
			return this.withLookahead(function (reader) {
				let max_skip_bits = reader.realignmentBits();
				let skip_bits = 0;
				let maybe_code = reader.peekBits(17);
				while (maybe_code != 1) {
					if (!in_error && skip_bits > max_skip_bits) {
						return null;
					}
					reader.skipBits(1);
					skip_bits += 1;
					maybe_code = reader.peekBits(17);
				}
				return skip_bits;
			});
		}
		realignmentBits() {
			return (8 - (this.bitsRead % 8)) % 8;
		}
		checkpoint() {
			return this.bitsRead;
		}
		readVLC(table) {
			var index = 0;
			while (true) {
				var res = table[index];
				if (res) {
					switch (res.type) {
						case VlcEntry.End:
							return res.value;
						case VlcEntry.Fork:
							let next_bit = this.readBits(1);
							if (next_bit == 0) {
								index = res.value[0];
							} else {
								index = res.value[1];
							}
							break;
					}
				} else {
					throw new Error("InternalDecoderError");
				}
			}
		}
		read_umv() {
			let start = this.readBits(1);
			if (start == 1)
				return HalfPel.from_unit(0);
			let mantissa = 0;
			let bulk = 1;
			while (bulk < 4096) {
				var r = this.readBits(2);
				switch (r) {
					case 0b00:
						return HalfPel.from_unit(mantissa + bulk);
					case 0b10:
						return HalfPel.from_unit(-(mantissa + bulk));
					case 0b01:
						mantissa <<= 1;
						bulk <<= 1;
						break;
					case 0b11:
						mantissa = mantissa << 1 | 1;
						bulk <<= 1;
						break;
				}
			}
			throw new Error("InvalidMvd");
		}
		bitAva() {
			return (this.source.length * 8) - this.bitsRead;
		}
		rollback(checkpoint) {
			if (checkpoint > (this.source.length * 8)) {
				throw new Error("InternalDecoderError");
			}
			this.bitsRead = checkpoint;
		}
		withTransaction(f) {
			var checkpoint = this.checkpoint();
			let result;
			try {
				result = f(this);
			} catch (e) {
				this.rollback(checkpoint);
				throw e;
			}
			return result;
		}
		withTransactionUnion(f) {
			var checkpoint = this.checkpoint();
			let result;
			try {
				result = f(this);
				if (result === null) this.rollback(checkpoint);
			} catch (e) {
				this.rollback(checkpoint);
				throw e;
			}
			return result;
		}
		withLookahead(f) {
			var checkpoint = this.checkpoint();
			let result = f(this);
			this.rollback(checkpoint);
			return result;
		}
	}
	return {
		H263Reader,
		H263State
	}
}());