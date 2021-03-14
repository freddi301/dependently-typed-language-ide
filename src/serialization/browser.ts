export function download(data: string, type: "application/json") {
  const filename = prompt();
  if (!filename) return;
  const file = new Blob([data], { type: type });
  if (window.navigator.msSaveOrOpenBlob) {
    // IE10+
    window.navigator.msSaveOrOpenBlob(file, filename);
  } else {
    // Others
    const a = document.createElement("a");
    const url = URL.createObjectURL(file);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);
  }
}

export function upload(onLoad: (text: string) => void) {
  const input = document.createElement("input");
  document.body.appendChild(input);
  input.type = "file";
  input.addEventListener("change", (event: any) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = function (event: any) {
      const contents = event.target.result;
      onLoad(contents);
      document.body.removeChild(input);
    };
    reader.readAsText(file);
  });
  input.click();
}

export function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}
