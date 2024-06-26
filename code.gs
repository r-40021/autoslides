/**
 * AutoSlides
 * Una plantilla de presentación de Google que permite generar un pase de 
 * diapositivas auto hospedado mediante una webapp que se actualiza automáticamente
 * a intervalos prefijados sin necesidad de recargar de manera manual en el navegador.
 *
 * Copyright (C) Pablo Felip (@pfelipm) · Se distribuye bajo licencia GNU GPL v3.
 *
 * @OnlyCurrentDoc
 */

// Constantes generales del script

var VERSION = 'Version: 1.1 (February 2020)';

var AJUSTES_P = {
  'initialized': 'true',
  'sAvanzar': '3',
  'sRecargar': '60',
  'msFundido': '1500',
  'colorFondo': '#ffffff',
  'iniciar': 'on',
  'repetir': 'on',
  'eliminarMenu': 'on',
  'eliminarBandas': 'on',
  'eliminarBordes': 'off'
};

var INSET_INFERIOR = 36; // Altura en px barra con botones inferior en presentación incrustada
var NUMERO_MAGICO = 14.25; // x ancho/alto para obtener el valor en px del recorte lateral que elimina bandas negras
var INSET_BORDES = 2;      // Desplazamiento adicional para eliminar todos los bordes mediante clip-path / inset (CSS) 
var TINYURL = 'https://tinyurl.com/api-create.php?url='; // URL para acortar usando servicio de TinyURL  

// Vamos a por faena...

function onOpen() {

  SlidesApp.getUi().createMenu('🔄 AutoSlides')
    .addItem('⚙️ 設定', 'configurar')
    .addItem('🌐 公開URLを取得', 'publicar')
    .addItem('🔻 公開停止', 'despublicar')
    .addSeparator()
    .addItem('💡 AutoSlidesについて', 'acercaDe')
    .addToUi();

}

// Info del script

function acercaDe() {

  // Presentación del complemento
  var panel = HtmlService.createTemplateFromFile('acercaDe');
  panel.version = VERSION;
  SlidesApp.getUi().showModalDialog(panel.evaluate().setWidth(420).setHeight(375), '💡 AutoSlidesとは？');
}

// Refrescar gráficos vinculados de HdC

function refrescarGraficosHdc() {

  // Versión V8: No se utiliza por bug V8 y ScriptApp.GetService().getUrl()
  // https://groups.google.com/d/topic/google-apps-script-community/0snPFcUqt40/discussion

  // SlidesApp.getActivePresentation().getSlides().map(diapo => {diapo.getSheetsCharts().map(grafico => {grafico.refresh();});});

  SlidesApp.getActivePresentation().getSlides().map(function (diapo) {
    diapo.getSheetsCharts().map(function (grafico) {
      grafico.refresh();
    });
  });

}

function contarGraficosHdc() {

  var numGraficos = 0;

  // Idem anterior: Versión V8. No se utiliza para seguir ejecutando con Rhino por bug V8 y ScriptApp.GetService().getUrl()

  // SlidesApp.getActivePresentation().getSlides().map(diapo => {diapo.getSheetsCharts().map(grafico => {numGraficos++});});

  SlidesApp.getActivePresentation().getSlides().map(function (diapo) {
    diapo.getSheetsCharts().map(function (grafico) { numGraficos++ });
  });

  return numGraficos;

}

function configurar() {

  // Inicializar y / o leer configuración

  if (PropertiesService.getScriptProperties().getProperty('initialized') != 'true') {

    // Establecer ajustes por defecto

    PropertiesService.getScriptProperties().setProperties(AJUSTES_P, true);

    // Inicialmente la publicación está desactivada

    PropertiesService.getScriptProperties().setProperty('publicar', 'false');

  }

  // Plantilla del panel

  var panel = HtmlService.createTemplateFromFile('panelLateral');

  // Valores iniciales de controles

  var ajustes = PropertiesService.getScriptProperties();

  panel.sAvanzar = ajustes.getProperty('sAvanzar');
  panel.sRecargar = ajustes.getProperty('sRecargar');
  panel.msFundido = ajustes.getProperty('msFundido');
  panel.colorFondo = ajustes.getProperty('colorFondo');
  panel.iniciar = ajustes.getProperty('iniciar') == 'on' ? 'checked' : '';
  panel.repetir = ajustes.getProperty('repetir') == 'on' ? 'checked' : '';
  panel.eliminarMenu = ajustes.getProperty('eliminarMenu') == 'on' ? 'checked' : '';
  panel.eliminarBandas = ajustes.getProperty('eliminarBandas') == 'on' ? 'checked' : '';
  panel.eliminarBordes = ajustes.getProperty('eliminarBordes') == 'on' ? 'checked' : '';
  panel.numGraficos = contarGraficosHdc();

  // Construir y desplegar panel de configuración

  SlidesApp.getUi().showSidebar(panel.evaluate().setTitle('🔄 AutoSlides: 埋め込みの設定'));

}

function ajustesPorDefecto() {

  // Invocado desde panelLateral_js
  // Restablecer ajustes por defecto (,false para preservar otras propiedades)

  PropertiesService.getScriptProperties().setProperties(AJUSTES_P, false);

  // Devolver a panelLateral_js para que actualice formulario
  return AJUSTES_P;

}

function actualizarAjustes(form) {

  // Invocado desde panelLateral_js
  // Al devolver form desde cliente, si una casilla de verificación no está marcada,
  // su propiedad (name) en el objeto pasado a servidor no se devuelve (cuidado).

  PropertiesService.getScriptProperties().setProperties({
    'sAvanzar': form.sAvanzar,
    'sRecargar': form.sRecargar,
    'msFundido': form.msFundido,
    'colorFondo': form.colorFondo,
    'iniciar': form.iniciar, // 'on' o NULL
    'repetir': form.repetir, // 'on' o NULL
    'eliminarMenu': form.eliminarMenu, // 'on' o NULL
    'eliminarBandas': form.eliminarBandas, // 'on' o NULL
    'eliminarBordes': form.eliminarBordes // 'on' o NULL
  }, false);

}

function obtenerRevisiones() {

  // Devuelve el ID de la última revisión de la presentación actual

  var slideId = SlidesApp.getActivePresentation().getId();
  var respuesta;
  var token;
  var revisiones = [];
  var hayMas = true;

  // Iterar hasta alcanzar la última revisión de la presentación

  try {

    while (hayMas == true) {
      respuesta = Drive.Revisions.list(slideId, { maxResults: 1000, pageToken: token });
      revisiones = revisiones.concat(respuesta.items);
      token = respuesta.nextPageToken;
      hayMas = (token == undefined) ? false : true;
    }

    // Devolver última revisión

    return revisiones[revisiones.length - 1].id;

  } catch (e) {

    SlidesApp.getUi().alert('🔄 AutoSlides', '❌ プレゼンテーションの更新情報を取得できませんでした。\n\n' + e, SlidesApp.getUi().ButtonSet.OK);

  }
}

// GASからデプロイURLを正確に取得できないため削除
// function acortarUrl() {

//   // Invocado desde infoPublicada

//   var urlCorto = PropertiesService.getScriptProperties().getProperty('urlCorto');

//   if (urlCorto == null) {

//     // No se ha acortado aún, lo haremos ahora y guardaremos URL corto en propiedades

//     urlCorto = UrlFetchApp.fetch(TINYURL + ScriptApp.getService().getUrl()).getContentText();
//     PropertiesService.getScriptProperties().setProperty('urlCorto', urlCorto);

//   }

//   return urlCorto;

// }

function publicar() {

  var slideId = SlidesApp.getActivePresentation().getId();
  var ultimaRevId = obtenerRevisiones();

  // Publicar última revisión de la presentación

  try {

    Drive.Revisions.patch({
      published: true,
      publishedOutsideDomain: true,
      publishAuto: true
    },
      slideId, ultimaRevId);

    PropertiesService.getScriptProperties().setProperty('publicar', 'true');

    // Si no se ha configurado previamente, establecer valores por defecto

    if (PropertiesService.getScriptProperties().getProperty('inicializado') != 'true') {
      ajustesPorDefecto();
    }

    if (ScriptApp.getService().isEnabled() == true) {

      // La webapp ya ha sido previamente publicada, obtener URL público (¡con V8 devuelve el privado /dev! a 18/02/20)

      var urlWebApp = ScriptApp.getService().getUrl();
      var panel = HtmlService.createTemplateFromFile('infoPublicada');

      panel.url = urlWebApp;
      SlidesApp.getUi().showModalDialog(panel.evaluate().setWidth(700).setHeight(175), '🔄 AutoSlides');

    } else {

      // El usuario debe realizar la publicación inicial de la webapp

      var panel = HtmlService.createHtmlOutputFromFile('instruccionesWebApp');
      SlidesApp.getUi().showSidebar(panel.setTitle('🌐 Instrucciones de publicación'));

    }


  } catch (e) {

    SlidesApp.getUi().alert('🔄 AutoSlides', '❌ プレゼンテーションを公開できませんでした。\n\n' + e, SlidesApp.getUi().ButtonSet.OK);

  }

}

function despublicar() {

  var slideId = SlidesApp.getActivePresentation().getId();
  var ultimaRevId = obtenerRevisiones();

  // Desactivar publicación de la última revisión de la presentación

  try {

    Drive.Revisions.patch({
      published: false,
      publishedOutsideDomain: false,
      publishAuto: false
    },
      slideId, ultimaRevId);

    PropertiesService.getScriptProperties().setProperty('publicar', 'false');
    SlidesApp.getUi().alert('🔄 AutoSlides', '🔻 このプレゼンテーションは現在公開されていません。', SlidesApp.getUi().ButtonSet.OK);

  } catch (e) {

    SlidesApp.getUi().alert('🔄 AutoSlides', '❌ プレゼンテーションを公開できませんでした\n\n' + e, SlidesApp.getUi().ButtonSet.OK);

  }

}

function doGet(e) {

  // Generar página web con presentación incrustada

  var incrustaWeb = HtmlService.createTemplateFromFile('slidesEmbed');

  // Rellenar elementos de plantilla

  var ajustes = PropertiesService.getScriptProperties().getProperties();
  var aspecto = 100 * SlidesApp.getActivePresentation().getPageHeight() / SlidesApp.getActivePresentation().getPageWidth();
  var offsetPx = ajustes.eliminarBordes == 'on' ? INSET_BORDES : 0;

  incrustaWeb.url = 'https://docs.google.com/presentation/d/' + SlidesApp.getActivePresentation().getId() + '/embed';
  incrustaWeb.iniciar = ajustes.iniciar == 'on' ? 'true' : 'false';
  incrustaWeb.repetir = ajustes.repetir == 'on' ? 'true' : 'false';
  incrustaWeb.msAvanzar = (+ajustes.sAvanzar * 1000).toString();
  incrustaWeb.msFundido = ajustes.msFundido;
  incrustaWeb.msRecargar = (+ajustes.sRecargar * 1000).toString();
  incrustaWeb.colorFondo = ajustes.colorFondo;
  incrustaWeb.insetInferior = ajustes.eliminarMenu == 'on' ? Math.ceil(INSET_INFERIOR + offsetPx).toString() : '0';
  incrustaWeb.insetLateral = ajustes.eliminarBandas == 'on' ? Math.ceil(100 * NUMERO_MAGICO / aspecto + offsetPx).toString() : '0';
  incrustaWeb.insetSuperior = offsetPx.toString();

  // Para "truco" CSS que hace el iframe responsive

  incrustaWeb.aspecto = aspecto.toString();

  return incrustaWeb.evaluate().setTitle(SlidesApp.getActivePresentation().getName()).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

}
