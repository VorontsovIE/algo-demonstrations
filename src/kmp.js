const d3 = Object.assign(
  {},
  require("d3-selection"),
  require("d3-transition"),
);


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

let shift_pattern_naive = async function(pattern_node, text, pattern, config) {
  let full_stop = false;
  for (let start_pos = 0; !full_stop && (start_pos + pattern.length <= text.length); ++start_pos) {
    let pattern_letter_params = Array.from(pattern).map(function(val,idx){
      return {letter: val, position: start_pos + idx, color: 'white'};
    });
    render_text(pattern_node, pattern_letter_params, {y: 40});
    await sleepNow(config.step_delay);

    let mismatch = false;
    for (let offset = 0; !mismatch && (offset <= pattern.length); ++offset){
      if (offset == pattern.length) {
        full_stop = true;
        break;
      }
      if (text[start_pos + offset] == pattern[offset]) {
        pattern_letter_params[offset].color = 'lightgreen';
      } else {
        pattern_letter_params[offset].color = 'pink';
        mismatch = true;
      }
      render_text(pattern_node, pattern_letter_params, {y: 40});
      await sleepNow(config.step_delay);
    }
  }
}

let search_demo = async function(svg, text, pattern, shift_fn, config) {
  let default_config = {step_delay: 750, final_delay: 4000};
  config = Object.assign(default_config, config);

  let text_letter_params = Array.from(text).map(function(val,idx){
    return {letter: val, position: idx, color: 'white'};
  });

  let pattern_letter_params = Array.from(pattern).map(function(val,idx){
    return {letter: val, position: idx, color: 'white'};
  });
  let text_node = svg.append("g").attr('id', 'main-text');
  let pattern_node = svg.append("g").attr('id', 'pattern-text');
  render_text(text_node, text_letter_params, {y: 0});
  
  while (true) {
    await shift_fn(pattern_node, text, pattern, config);
    await sleepNow(config.final_delay);
  }
}

export {d3, shift_pattern_naive, search_demo};
