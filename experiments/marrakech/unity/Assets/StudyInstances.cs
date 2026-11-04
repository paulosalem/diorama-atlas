using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using UnityEngine.Rendering;

[Serializable] public class StudyInstanceGroup {
    public string name;
    public int count, matrixOffset, colorOffset;
    public float[] boundsCenter, boundsSize;
    public Mesh mesh;
    public Material material;
}

public class StudyInstances : MonoBehaviour {
    public TextAsset transforms;
    public StudyInstanceGroup[] groups;
    public int instanceCount;
    public Camera viewCamera;
    public float shadowDistance;
    private readonly List<Batch> batches = new List<Batch>();
    private readonly Plane[] planes = new Plane[6];
    private readonly Plane[] reflectionPlanes = new Plane[6];
    private class Batch {
        public Mesh mesh;
        public Material material;
        public Matrix4x4[] matrices;
        public MaterialPropertyBlock properties;
        public Bounds bounds;
    }

    void Awake() {
        using (var stream = new MemoryStream(transforms.bytes))
        using (var reader = new BinaryReader(stream)) {
            foreach (var group in groups) {
                for (int start = 0; start < group.count; start += 1023) {
                    int count = Math.Min(1023, group.count - start);
                    var matrices = new Matrix4x4[count];
                    var colors = new Vector4[count];
                    var bounds = new Bounds();
                    stream.Position = group.matrixOffset + start * 64;
                    for (int i = 0; i < count; i++) {
                        var matrix = new Matrix4x4();
                        for (int j = 0; j < 16; j++) matrix[j] = reader.ReadSingle();
                        // glTFast mirrors X in both geometry and transforms.
                        var mirror = Matrix4x4.Scale(new Vector3(-1, 1, 1));
                        matrices[i] = mirror * matrix * mirror;
                        var center = matrices[i].MultiplyPoint3x4(group.mesh.bounds.center);
                        var extents = group.mesh.bounds.extents;
                        var x = matrices[i].MultiplyVector(new Vector3(extents.x, 0, 0));
                        var y = matrices[i].MultiplyVector(new Vector3(0, extents.y, 0));
                        var z = matrices[i].MultiplyVector(new Vector3(0, 0, extents.z));
                        var size = new Vector3(Mathf.Abs(x.x) + Mathf.Abs(y.x) + Mathf.Abs(z.x),
                            Mathf.Abs(x.y) + Mathf.Abs(y.y) + Mathf.Abs(z.y),
                            Mathf.Abs(x.z) + Mathf.Abs(y.z) + Mathf.Abs(z.z)) * 2;
                        var instanceBounds = new Bounds(center, size);
                        if (i == 0) bounds = instanceBounds;
                        else bounds.Encapsulate(instanceBounds);
                    }
                    stream.Position = group.colorOffset + start * 16;
                    for (int i = 0; i < count; i++)
                        colors[i] = new Vector4(reader.ReadSingle(), reader.ReadSingle(), reader.ReadSingle(), reader.ReadSingle());
                    var properties = new MaterialPropertyBlock();
                    properties.SetVectorArray("_StudyColor", colors);
                    bounds.Expand(.12f);
                    batches.Add(new Batch { mesh = group.mesh, material = group.material, matrices = matrices, properties = properties, bounds = bounds });
                }
            }
        }
    }

    void LateUpdate() {
        GeometryUtility.CalculateFrustumPlanes(viewCamera, planes);
        var reflection = GetComponent<StudyPlanarWater>();
        bool reflected = reflection != null;
        if (reflected) GeometryUtility.CalculateFrustumPlanes(reflection.ViewProjection, reflectionPlanes);
        foreach (var batch in batches) {
            bool visible = GeometryUtility.TestPlanesAABB(planes, batch.bounds)
                || (reflected && GeometryUtility.TestPlanesAABB(reflectionPlanes, batch.bounds));
            bool castsShadow = batch.bounds.SqrDistance(viewCamera.transform.position) <= shadowDistance * shadowDistance;
            if (!visible && !castsShadow) continue;
            Graphics.DrawMeshInstanced(batch.mesh, 0, batch.material, batch.matrices,
                batch.matrices.Length, batch.properties,
                !visible ? ShadowCastingMode.ShadowsOnly : castsShadow ? ShadowCastingMode.On : ShadowCastingMode.Off, true,
                gameObject.layer, null, LightProbeUsage.BlendProbes);
        }
    }

    void OnDestroy() {
        foreach (var batch in batches) batch.properties.Clear();
        batches.Clear();
    }
}
