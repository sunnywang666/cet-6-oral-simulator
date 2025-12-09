// components/visualizer/visualizer.js
Component({
  properties: {
    isListening: {
      type: Boolean,
      value: false
    }
  },

  data: {
    bars: [
      { delay: 0, duration: 0.5 },
      { delay: 0.1, duration: 0.6 },
      { delay: 0.2, duration: 0.7 },
      { delay: 0.3, duration: 0.8 },
      { delay: 0.4, duration: 0.9 }
    ]
  }
});



