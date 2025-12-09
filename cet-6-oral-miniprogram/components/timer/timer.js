// components/timer/timer.js
Component({
  properties: {
    duration: {
      type: Number,
      value: 60
    },
    isActive: {
      type: Boolean,
      value: false
    },
    label: {
      type: String,
      value: ''
    },
    variant: {
      type: String,
      value: 'default' // default, warning, success
    }
  },

  data: {
    timeLeft: 60,
    formattedTime: '1:00',
    progress: 100
  },

  observers: {
    'duration, isActive': function(duration, isActive) {
      if (isActive) {
        this.setData({ timeLeft: duration });
        this.startTimer();
      } else {
        this.stopTimer();
      }
    }
  },

  lifetimes: {
    attached() {
      this.setData({ timeLeft: this.properties.duration });
      this.updateFormattedTime();
    },
    detached() {
      this.stopTimer();
    }
  },

  methods: {
    startTimer() {
      this.stopTimer(); // Clear any existing timer
      
      this.timer = setInterval(() => {
        const timeLeft = this.data.timeLeft - 1;
        
        if (timeLeft <= 0) {
          this.stopTimer();
          this.triggerEvent('finish');
          this.setData({ timeLeft: 0, progress: 0 });
        } else {
          this.setData({ timeLeft, progress: (timeLeft / this.properties.duration) * 100 });
          this.updateFormattedTime();
        }
      }, 1000);
    },

    stopTimer() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    },

    updateFormattedTime() {
      const m = Math.floor(this.data.timeLeft / 60);
      const s = this.data.timeLeft % 60;
      this.setData({
        formattedTime: `${m}:${s.toString().padStart(2, '0')}`
      });
    }
  }
});



