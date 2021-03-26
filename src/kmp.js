const d3 = Object.assign(
  {},
  require("d3-selection"),
);

let cloneDeep = require('lodash.clonedeep');


// let data = [4,8,1,5];
// d3.select("body")
//   .selectAll("p")
//   .data(data)
//   .enter().append("p")
//     .text(function(d) { return "I’m number " + d + "!"; });

let render_text = function(node, letter_params, config) {
  let default_config = {y: 0};
  config = (typeof config === 'undefined') ? default_config : config;
  let draw_letter = function(g) {
    g.attr("transform", d => `translate(${d.position * 30} ${config.y})`);
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
    .data(letter_params, (d,i) => i)
    .join(
      enter => enter.append("g").call(draw_letter),
      update => update.call(draw_letter),
      exit => exit.remove()
    );

  return node.node();
}

const sleepNow = (delay) => new Promise(resolve => setTimeout(resolve, delay));

let pattern_shifts_naive = function*(text, pattern) {
  let text_letters = Array.from(text).map(function(val,idx){
    return {letter: val, position: idx, color: 'white'};
  });

  let full_stop = false;
  for (let start_pos = 0; !full_stop && (start_pos + pattern.length <= text.length); ++start_pos) {
    let pattern_letters = Array.from(pattern).map(function(val, idx){
      return {letter: val, position: start_pos + idx, color: 'white'};
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
        yield {text_letters: text_letters, pattern_letters: pattern_letters, status: 'final'};
      } else{
        yield {text_letters: text_letters, pattern_letters: pattern_letters, status: 'step'};
      }
    }
  }
}


let render_sliding_pattern = async function(text_node, pattern_node, generator, config) {
  for (let state of generator) {
    render_text(text_node, state.text_letters, {y: 0});
    render_text(pattern_node, state.pattern_letters, {y: 40});
    if (state.status == 'start' || state.status == 'step') {
      await sleepNow(config.step_delay);
    } else if (state.status == 'final') {
      await sleepNow(config.final_delay);
    }
  }
}

let search_demo = async function(svg, generator, config) {
  let default_config = {step_delay: 750, final_delay: 4000};
  config = Object.assign(default_config, config);

  let text_node = svg.append("g").attr('id', 'main-text');
  let pattern_node = svg.append("g").attr('id', 'pattern-text');

  while (true) {
    await render_sliding_pattern(text_node, pattern_node, generator, config);
    await sleepNow(config.final_delay);
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
    generator = generator_fn();
  }
}


export {d3, pattern_shifts_naive, resettable_loop, search_demo};
