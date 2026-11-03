mergeInto(LibraryManager.library, {
  ReportStudyFrame: function (fps, animationTime, meshes, animations, patinaMaterials, instances, windMaterials) {
    window.__unityStudy = { fps, animationTime, meshes, animations, patinaMaterials, instances, windMaterials };
  }
});
