const d3 = Object.assign(
  {},
  require("d3-selection"),
);

let cloneDeep = require('lodash.clonedeep');

let render_text = function(node, letter_params) {
  let draw_letter = function(g) {
    g.attr("transform", d => `translate(${d.position * 30} ${40 * d.row})`);
    g.append("rect")
      .attr("x", 0)
      .attr("width", 28)
      .attr("y", 0)
      .attr("height", 34)
      .attr("stroke", 'black')
      .attr("fill", d => d.color);
    g.append("text")
      .attr("x", 2)
      .attr("y", 26)
      .attr("font-family", "Monospace")
      .attr("font-size", 28)
      .attr("textLength", 24)
      .attr("dominant-baseline", "alphabetic")
      .attr("lengthAdjust", "spacingAndGlyphs")
      .attr("fill", "blue")
      .text(d => d.letter);
  };
  node.selectAll("g")
    .data(letter_params, (d,i) => d)
    .join(
      enter => enter.append("g").call(draw_letter),
      update => update.call(draw_letter),
      exit => exit.remove()
    );

  return node.node();
}

const sleepNow = (delay) => new Promise(resolve => setTimeout(resolve, delay));

let pattern_shifts_naive = function*(text, pattern) {
  let text_letters = Array.from(text).map(function(val, idx){
    return {letter: val, position: idx, color: 'white', row: 0};
  });

  let full_stop = false;
  for (let start_pos = 0; !full_stop && (start_pos + pattern.length <= text.length); ++start_pos) {
    let pattern_letters = Array.from(pattern).map(function(val, idx){
      return {letter: val, position: start_pos + idx, color: 'white', row: 1};
    });

    yield {text_letters: text_letters, pattern_letters: pattern_letters, status: 'start'};

    let mismatch = false;
    for (let offset = 0; !mismatch && (offset < pattern.length); ++offset){
      pattern_letters = cloneDeep(pattern_letters);
      if (text[start_pos + offset] == pattern[offset]) {
        pattern_letters[offset].color = 'lightgreen';
      } else {
        pattern_letters[offset].color = 'pink';
        mismatch = true;
      }

      if ((offset + 1 == pattern.length) && !mismatch) {
        stop = true;
        full_stop = true;
        yield {text_letters: text_letters, pattern_letters: pattern_letters, status: 'match'};
      } else{
        yield {text_letters: text_letters, pattern_letters: pattern_letters, status: 'step'};
      }
    }
  }
}

let prefix_function = function(s) {
  let pi = new Array(s.length + 1);
  pi[0] = pi[1] = 0;
  for (let i = 1; i < s.length; ++i) {
    let k = pi[i];
    while ((k > 0) && (s[k] != s[i])) {
      k = pi[k];
    }
    if (s[k] == s[i]) {
      k += 1;
    }
    pi[i + 1] = k;
  }
  return pi;
}


let pattern_shifts_kmp = function*(text, pattern) {
  let pi = prefix_function(pattern);
  let text_letters = Array.from(text).map(function(val, idx){
    return {letter: val, position: idx, color: 'white', row: 0};
  });

  let gen_pattern_state = function(start_pos, len_checked, row) {
    let result = Array.from(pattern).map(function(val, idx){
      let letter_pos = start_pos + idx;
      let letter_color;
      if (idx < len_checked) {
        if (pattern[idx] == text[letter_pos]) {
          letter_color = 'lightgreen';
        } else {
          letter_color = 'pink';
        }
      } else {
        letter_color = 'white';
      }
      return {letter: val, position: letter_pos, color: letter_color, row: row};
    });
    return result;
  };

  let gen_state = function(start_pos, len_checked, status) {
    let pattern_letters;
    if (status == 'jump') {
      let pos = start_pos + len_checked;
      let new_len_checked = pi[len_checked];
      let row_1 = gen_pattern_state(start_pos, len_checked, 1);
      let row_2 = gen_pattern_state(pos - new_len_checked, new_len_checked, 2);
      pattern_letters = row_1.concat(row_2);
    } else {
      pattern_letters = gen_pattern_state(start_pos, len_checked, 1);
    }
    return {
      text_letters: text_letters,
      pattern_letters: pattern_letters,
      status: status,
    };
  };

  let len_matched = 0;
  yield gen_state(0, 0, 'start');
  for (let pos = 0; pos < text.length; ++pos) {
    let start_pos = pos - len_matched;
    if (len_matched == 0){
      yield gen_state(start_pos, 0, 'step');
    }
    yield gen_state(start_pos, len_matched + 1, 'step');

    while ((len_matched > 0) && (text[pos] != pattern[len_matched])){
      yield gen_state(pos - len_matched, len_matched, 'jump');
      len_matched = pi[len_matched];
      yield gen_state(pos - len_matched, len_matched, 'step');
      yield gen_state(pos - len_matched, len_matched + 1, 'step');
    }

    if (text[pos] == pattern[len_matched]) {
      len_matched = len_matched + 1;
    }

    if (len_matched == pattern.length) { // TO CHECK!!!
      yield gen_state(start_pos, len_matched, 'match');
      len_matched = pi[len_matched];
      start_pos = pos - len_matched;
    }
  }
}


let render_sliding_pattern = async function(text_node, pattern_node, generator, config) {
  for (let state of generator) {
    if (state.status == 'end_loop') {
      await sleepNow(config.final_delay)
      continue;
    }
    render_text(text_node, state.text_letters);
    render_text(pattern_node, state.pattern_letters);
    if (state.status == 'start' || state.status == 'step') {
      await sleepNow(config.step_delay);
    } else if (state.status == 'match') {
      await sleepNow(config.match_delay);
    } else if (state.status == 'jump') {
      await sleepNow(config.jump_delay);
    } else { // in case that we introduce novel status
      await sleepNow(config.step_delay);
    }
  }
}

let search_demo = async function(svg, generator, config) {
  let default_config = {step_delay: 750, match_delay: 2000, final_delay: 4000, jump_delay: 4000};
  config = Object.assign(default_config, config);

  let text_node = svg.append("g").attr('id', 'main-text');
  let pattern_node = svg.append("g").attr('id', 'pattern-text');

  while (true) {
    await render_sliding_pattern(text_node, pattern_node, generator, config);
  }
}

let resettable_loop = function*(generator_fn){
  let generator = generator_fn();
  while (true) {
    for (let value of generator) {
      let new_generator_fn = yield value;
      if (new_generator_fn !== undefined) {
        generator_fn = new_generator_fn;
        break;
      }
    }
    yield {status: 'end_loop'}
    generator = generator_fn();
  }
}

export {d3, pattern_shifts_naive, pattern_shifts_kmp, resettable_loop, search_demo};
