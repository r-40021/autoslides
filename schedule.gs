function changeVisible() {
  const now = new Date();
  const presentation = SlidesApp.getActivePresentation();
  const spreadsheet = SpreadsheetApp.openById('xxxxxxxxxxxxxxxxx');
  const sheetList = ['場所A', '場所B', '場所C'];

  const fillColor = '#ffffff';

  for (const sheetName of sheetList) {
    const sheet = spreadsheet.getSheetByName(sheetName);
    const data = sheet.getRange(`A2:E${sheet.getLastRow()}`).getValues();

    let previousSlide = data[0][4].split(',');

    for (const event of data) {
      if (new Date(`${event[0].getFullYear()}/${event[0].getMonth() + 1}/${event[0].getDate()} ${event[2].getHours()}:${event[2].getMinutes()}`).getTime() <= now.getTime()) {

        console.log('表示変更', `${event[0].getFullYear()}/${event[0].getMonth() + 1}/${event[0].getDate()} ${event[2].getHours()}:${event[2].getMinutes()}`)
        const slides = event[4].toString().split(',');

        for (let i = 0; i < slides.length; i++) {
          const slide = presentation.getSlides()[Number(slides[i]) - 1];

          // 透明度下げる
          const shapes = slide.getShapes();
          const matchShape = shapes.find(shape => shape.getText().asString().trim() === event[3].trim()); // イベント名に一致する長方形
          if (matchShape) {
            console.log('透明度下げる')
            matchShape.getFill().setSolidFill(fillColor, 0.85); // 長方形の透明度を下げる
          }
          // スライド変わったら非表示にする
          if (Number(slides[i]) > previousSlide[i]) {
            console.log('非表示に', slides[i])
            presentation.getSlides()[previousSlide[i] - 1].setSkipped(true);

            PropertiesService.getScriptProperties().setProperty('sRecargar', Number(PropertiesService.getScriptProperties().getProperty('sRecargar')) - Number(PropertiesService.getScriptProperties().getProperty('sAvanzar'))); // リロード間隔を1スライド分減らす
          }

          previousSlide[i] = Number(event[4].split(',')[i]);
        }
      }
    }
  }
}
