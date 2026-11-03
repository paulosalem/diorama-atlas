using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

public class StudyPlanarWater : MonoBehaviour {
    public Camera source;
    public Material water;
    public float height;
    private Camera reflection;
    private RenderTexture texture;
    private Matrix4x4 mirror;
    private bool rendering;
    private Matrix4x4 lastProjection;
    private float lastTime = -1;
    public Matrix4x4 ViewProjection => source.projectionMatrix * source.worldToCameraMatrix * mirror;

    void OnEnable() {
        mirror = Matrix4x4.Scale(new Vector3(1, -1, 1));
        mirror.m13 = 2 * height;
        texture = new RenderTexture(512, 512, 24, RenderTextureFormat.ARGBHalf) {
            name = "River planar reflection", hideFlags = HideFlags.HideAndDontSave
        };
        texture.Create();
        reflection = new GameObject("River reflection camera", typeof(Camera)).GetComponent<Camera>();
        reflection.gameObject.hideFlags = HideFlags.HideAndDontSave;
        reflection.enabled = false;
        var data = reflection.GetUniversalAdditionalCameraData();
        data.renderShadows = false;
        data.renderPostProcessing = false;
        data.requiresColorOption = CameraOverrideOption.Off;
        data.requiresDepthOption = CameraOverrideOption.Off;
        water.SetTexture("_PlanarReflection", texture);
        water.SetFloat("_UsePlanar", 1);
        RenderPipelineManager.beginCameraRendering += Render;
    }

    void Render(ScriptableRenderContext context, Camera camera) {
        if (camera != source || rendering) return;
        var current = ViewProjection;
        float time = Shader.GetGlobalFloat("_StudyClock");
        if (time == lastTime && current == lastProjection) return;
        rendering = true;
        bool previous = GL.invertCulling;
        try {
            reflection.CopyFrom(source);
            reflection.enabled = false;
            reflection.targetTexture = texture;
            reflection.cullingMask = source.cullingMask & ~(1 << 31);
            reflection.transform.position = mirror.MultiplyPoint(source.transform.position);
            reflection.worldToCameraMatrix = source.worldToCameraMatrix * mirror;
            var plane = reflection.worldToCameraMatrix.inverse.transpose * new Vector4(0, 1, 0, -height);
            reflection.projectionMatrix = source.CalculateObliqueMatrix(plane);
            water.SetMatrix("_ReflectionMatrix", GL.GetGPUProjectionMatrix(reflection.projectionMatrix, true) * reflection.worldToCameraMatrix);
            GL.invertCulling = !previous;
#pragma warning disable CS0618
            UniversalRenderPipeline.RenderSingleCamera(context, reflection);
#pragma warning restore CS0618
            lastProjection = current;
            lastTime = time;
        } finally {
            GL.invertCulling = previous;
            rendering = false;
        }
    }

    void OnDisable() {
        RenderPipelineManager.beginCameraRendering -= Render;
        if (reflection != null) Destroy(reflection.gameObject);
        if (texture != null) {
            texture.Release();
            Destroy(texture);
        }
    }
}
