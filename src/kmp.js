const d3 = Object.assign(
  {},
  require("d3-selection"),
);

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

let pattern_shifts_naive = function*(text, pattern, config) {
  let default_config = {ignore_full_stop: false, allow_hanging_suffix: false};
  config = Object.assign({}, default_config, config);

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
    let index_letters = Array.from(text).map(function(val, idx){
      return {letter: ('' + idx), position: idx, color: 'white', row: 0};
    });
    let text_letters = Array.from(text).map(function(val, idx){
      return {letter: val, position: idx, color: 'white', row: 1};
    });
    let pattern_letters = gen_pattern_state(start_pos, len_checked, 2);
    return {
      letters: text_letters.concat(pattern_letters, index_letters),
      status: status,
    };
  };

  yield gen_state(0, 0, 'start');
  let full_stop = false;
  for (let start_pos = 0; start_pos < text.length; ++start_pos) {
    if (!config.ignore_full_stop && full_stop) {
      break
    }
    if (!config.allow_hanging_suffix && (start_pos + pattern.length > text.length)) {
      break
    }
    yield gen_state(start_pos, 0, 'start');

    let mismatch = false;
    for (let offset = 0; !mismatch && (offset < pattern.length); ++offset){
      if (text[start_pos + offset] != pattern[offset]) {
        mismatch = true;
      }

      if ((offset + 1 == pattern.length) && !mismatch) {
        if (!config.ignore_full_stop) {
          full_stop = true;
        }
        yield gen_state(start_pos, offset + 1, 'match');
      } else{
        yield gen_state(start_pos, offset + 1, mismatch ? 'mismatch' : 'step');
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


let pattern_shifts_kmp = function*(text, pattern, config) {
  let default_config = {ignore_full_stop: false, allow_hanging_suffix: false};
  config = Object.assign({}, default_config, config);

  let pi = prefix_function(pattern);
  let index_letters = Array.from(text).map(function(val, idx){
    return {letter: ('' + idx), position: idx, color: 'white', row: 0};
  });
  let text_letters = Array.from(text).map(function(val, idx){
    return {letter: val, position: idx, color: 'white', row: 1};
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
    // console.log(start_pos, len_checked, status);
    let pattern_letters;
    if (status == 'jump_match' || status == 'jump_mismatch') {
      let pos = start_pos + len_checked;
      let new_len_checked = pi[len_checked];
      let row_1;
      if (status == 'jump_mismatch') {
        row_1 = gen_pattern_state(start_pos, len_checked + 1, 2);
      } else {
        row_1 = gen_pattern_state(start_pos, len_checked, 2);
      }
      let row_2 = gen_pattern_state(pos - new_len_checked, new_len_checked, 3);
      pattern_letters = row_1.concat(row_2);
    } else {
      pattern_letters = gen_pattern_state(start_pos, len_checked, 2);
    }
    return {
      letters: text_letters.concat(pattern_letters, index_letters),
      status: status,
    };
  };

  let len_matched = 0;
  yield gen_state(0, 0, 'start');
  for (let pos = 0; pos < text.length; ++pos) {
    let start_pos = pos - len_matched;
    if (!config.allow_hanging_suffix && start_pos + pattern.length > text.length) {
      return;
    }
    if (len_matched == 0){
      yield gen_state(start_pos, 0, 'step');
    }
    yield gen_state(start_pos, len_matched + 1, 'step');

    while ((len_matched > 0) && (text[pos] != pattern[len_matched])){
      start_pos = pos - len_matched;
      yield gen_state(start_pos, len_matched, 'jump_mismatch');
      len_matched = pi[len_matched];
      start_pos = pos - len_matched;
      yield gen_state(start_pos, len_matched, 'step');
      if (!config.allow_hanging_suffix && start_pos + pattern.length > text.length) {
        return;
      }
      yield gen_state(start_pos, len_matched + 1, 'step');
    }

    if (text[pos] == pattern[len_matched]) {
      len_matched = len_matched + 1;
    }

    if (len_matched == pattern.length) {
      yield gen_state(start_pos, len_matched, 'match');
      if (!config.ignore_full_stop) {
        return;
      }
      yield gen_state(start_pos, len_matched, 'jump_match');
      len_matched = pi[len_matched];
      start_pos = pos - len_matched + 1;
      if (!config.allow_hanging_suffix && start_pos + pattern.length > text.length) {
        return;
      }
      if (start_pos >= text.length) {
        return;
      }
      yield gen_state(start_pos, len_matched, 'step');
    }
  }
}


let render_sliding_pattern = async function(svg_node, generator, config) {
  for (let state of generator) {
    if (state.status == 'end_loop') {
      await sleepNow(config.final_delay)
      continue;
    }
    let letters = state.letters;
    render_text(svg_node, letters);
    if (state.status == 'step' && config.step_delay) {
      await sleepNow(config.step_delay);
    } else if (state.status == 'match' && config.match_delay) {
      await sleepNow(config.match_delay);
    } else if (state.status == 'mismatch' && config.mismatch_delay) {
      await sleepNow(config.mismatch_delay);
    } else if ((state.status == 'jump_match' || state.status == 'jump_mismatch') && config.jump_delay) {
      await sleepNow(config.jump_delay);
    } else if (state.status == 'start' && config.start_delay) {
      await sleepNow(config.start_delay);
    } else { // in case that we introduce novel status
      await sleepNow(config.step_delay);
    }
  }
}

let search_demo = async function(svg, generator, config) {
  let default_config = {step_delay: 750, match_delay: 2000, final_delay: 4000, jump_delay: 4000};
  config = Object.assign({}, default_config, config);
  while (true) {
    await render_sliding_pattern(svg, generator, config);
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
