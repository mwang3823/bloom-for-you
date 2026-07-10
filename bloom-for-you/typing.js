// Typing Effect Engine for Love Game

class LetterTyping {
  constructor() {
    this.target = document.getElementById('letter-content');

    // Refined, gentle Vietnamese confession letter text with embedded speed and pause tags
    this.confessionText =
      `{delay:45}Gửi Pthuy, người đẹp trong lòng của Mwang...{pause:1000}

{delay:40}Hong biết lúc Pthuy đọc tới đây thì... {pause:300}Pthuy nhận được hoa của Mwang chưa he? 🌷{pause:600}
{delay:40}Còn quán này nữa... {pause:300}Pthuy thấy shaooo? {pause:300}lựa lâu lắm á ní. 😉{pause:1000}

{delay:50}Thật ra... {pause:400}Mwang chuẩn bị cho ngày hôm nay hơn một tháng trước.{pause:900} Tại có nói mấp mé mấy lần mà cổ từ chối 🫪.{pause:600}
{delay:50}Phải kể từ đêm tụi mình đi chơi xuyên đêm, {pause:300}ngồi nói với nhau đủ thứ chuyện trên đời, {pause:200}rồi deeptalk quên thời gian luôn...{pause:900}
{delay:55}Từ lúc đó, {pause:200}Mwang nghĩ...{pause:500}
{delay:50}"Chetme, Mwang dính pẫy roiii 🫪"{pause:1000}

{delay:45}Rồi từ lúc đó, {pause:200}Mwang âm thầm chuẩn bị từng chút.{pause:600}
{delay:45}Muốn chọn một ngày trời đẹp, {pause:300}một bó hoa thật xinh, {pause:300}một quán ăn bíu ti phun...{pause:500}
{delay:45}để khoảnh khắc này là một kỷ niệm của tụi mình.{pause:1200}

{delay:55}Pthuy xinh thì khỏi nói rồi...{pause:500}
{delay:55}Nhưng cái làm Mwang rung động, {pause:200}là con người của Pthuy.{pause:900}
{delay:55}Dịu dàng, {pause:150}tinh tế, {pause:150}cách Pthuy quan tâm người khác một cách rất tự nhiên... {pause:200}
{delay:50}Nhiu đó thoi mà tui đổ pà đó {pause:1100}

{delay:50}Mà nói thiệt...{pause:300}
{delay:50}Hong biết lúc ngồi với nhau, {pause:200}Mwang có tỏ tình mượt hong nữa.{pause:900}
{delay:45}T nghi t cứng họng luôn quá. ☺️{pause:200}

{delay:60}Nhưng có một điều chắc chắn là...{pause:800}

{delay:75}Mwang thích Pthuy.{pause:800}

{delay:75}Thích thật lòng.{pause:1100}

{delay:80}Nên là...{pause:600}

{delay:85}Pthuy cho Mwang cơ hội làm người yêu Pthuy nhá? 🤍{pause:1400}

{delay:55}Nếu đồng ý, {pause:200}thì từ nay, {pause:200}chúng mình chính thức là chúng mình ❤️`;


    // Strip out all tags to create the clean plain-text version for quick display/scroll calculations
    this.plainText = this.confessionText.replace(/\{[^}]+\}/g, '');

    this.tokens = [];
    this.tokenIndex = 0;
    this.typingTimeout = null;
    this.lastTap = 0;
  }

  // Parse text into commands (delay, pause) and printable characters
  parseText(text) {
    const tokens = [];
    const regex = /\{([^}]+)\}/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add regular characters leading up to the tag
      const preText = text.substring(lastIndex, match.index);
      for (let char of preText) {
        tokens.push({ type: 'char', value: char });
      }

      // Parse tag type and value
      const tagContent = match[1];
      const parts = tagContent.split(':');
      if (parts.length === 2) {
        const type = parts[0].trim();
        const value = parseInt(parts[1].trim(), 10);
        tokens.push({ type, value });
      }

      lastIndex = regex.lastIndex;
    }

    // Add remaining tail characters
    const postText = text.substring(lastIndex);
    for (let char of postText) {
      tokens.push({ type: 'char', value: char });
    }

    return tokens;
  }

  // Starts character typing flow
  startTyping(onCompleteCallback) {
    if (!this.target) return;
    this.target.innerHTML = '';

    // Parse the markup text into execution tokens
    this.tokens = this.parseText(this.confessionText);
    this.tokenIndex = 0;

    // Create the typewriter blink cursor
    const cursor = document.createElement('span');
    cursor.classList.add('typing-cursor');
    cursor.innerText = '|';

    // Double-click/double-tap skip shortcut for developers/testing
    this.target.style.cursor = 'pointer';
    const skipTyping = () => {
      this.stopTyping();
      this.target.innerHTML = this.plainText;
      this.target.appendChild(cursor);
      this.tokenIndex = this.tokens.length;
      this.target.scrollTop = this.target.scrollHeight;
      if (onCompleteCallback) onCompleteCallback();
    };

    this.target.addEventListener('dblclick', skipTyping);
    this.target.addEventListener('touchstart', (e) => {
      const now = Date.now();
      if (now - this.lastTap < 300) {
        skipTyping();
      }
      this.lastTap = now;
    });

    let currentPrintedText = '';
    let currentDelay = 80; // Default typing speed

    const processNextToken = () => {
      if (this.tokenIndex >= this.tokens.length) {
        // Typing fully completed
        if (onCompleteCallback) onCompleteCallback();
        return;
      }

      const token = this.tokens[this.tokenIndex];
      this.tokenIndex++;

      if (token.type === 'delay') {
        currentDelay = token.value;
        processNextToken(); // process next immediately since delay is a state change
      }
      else if (token.type === 'pause') {
        // Pause typewriter execution
        this.typingTimeout = setTimeout(processNextToken, token.value);
      }
      else if (token.type === 'char') {
        // Print character
        currentPrintedText += token.value;
        this.target.innerHTML = currentPrintedText;
        this.target.appendChild(cursor);

        // Scroll down as content wraps
        this.target.scrollTop = this.target.scrollHeight;

        // Play keyboard switch typing chime
        if (token.value !== ' ' && token.value !== '\n' && window.effects) {
          window.effects.playTypingSound();
        }

        // Apply dynamic baseline fluctuation for organic feel
        const organicDelay = currentDelay + (Math.random() - 0.5) * 15;
        this.typingTimeout = setTimeout(processNextToken, Math.max(10, organicDelay));
      }
    };

    processNextToken();
  }

  stopTyping() {
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }
  }
}

// Instantiate globally
window.letterTyping = new LetterTyping();
