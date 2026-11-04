using System;
using System.IO;
using System.Linq;
using System.Collections.Generic;
using UnityEditor;
using UnityEditor.Build;
using UnityEditor.Animations;
using UnityEditor.Build.Reporting;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

public static class BuildStudy {
    [Serializable] private class LightData {
        public string type;
        public float[] color;
        public float[] position;
        public float intensity;
        public float distance;
    }
    [Serializable] private class PatinaData {
        public int profileIndex;
        public float strength, seed, floor, microStrength;
        public float[] tileGrid, mapTransform;
        public string profile;
    }
    [Serializable] private class WindData { public float[] anchor; }
    [Serializable] private class MaterialData { public string name; public PatinaData patina; public WindData wind; public bool unlit; public float metresPerRepeat; }
    [Serializable] private class StudyData {
        public string id, title, sceneId, defaultView;
        public bool outdoor;
        public float farClip, fogDensity, shadowDistance, probeFar;
        public float[] fogColor, sunPosition, sunTarget, probePosition, probeSize, steamPosition;
    }
    [Serializable] private class Manifest {
        public LightData[] lights;
        public MaterialData[] materials;
        public StudyData study;
        public StudyInstanceGroup[] instanceGroups;
        public int instances;
    }
    private static string StudyId {
        get {
            var args = Environment.GetCommandLineArgs();
            int index = Array.IndexOf(args, "-study");
            string value = index >= 0 ? args[index + 1] : "marrakech";
            if (value != "marrakech" && value != "douro") throw new Exception("Unknown study: " + value);
            return value;
        }
    }
    private static string AssetRoot => StudyId == "marrakech" ? "../assets/" : "../assets/" + StudyId + "/";
    private static Manifest ReadManifest() {
        return JsonUtility.FromJson<Manifest>(File.ReadAllText(AssetRoot + "scene.json"));
    }

    public static void Build() {
        try {
            Prepare();
            var result = BuildPipeline.BuildPlayer(new BuildPlayerOptions {
                scenes = new[] { "Assets/Generated/" + StudyId + ".unity" },
                locationPathName = StudyId == "marrakech" ? "Build" : "Build/" + StudyId,
                target = BuildTarget.WebGL,
                options = BuildOptions.None
            });
            if (result.summary.result != BuildResult.Succeeded || result.summary.totalErrors > 0)
                throw new Exception("Unity Web build failed: " + result.summary.result + ", " + result.summary.totalErrors + " errors");
            Debug.Log("STUDY_WEB_BUILD_SUCCESS: " + StudyId);
            EditorApplication.Exit(0);
        } catch (Exception error) {
            Debug.LogException(error);
            EditorApplication.Exit(1);
        }
    }

    public static void Configure() {
        Directory.CreateDirectory("Assets/Imported");
        Directory.CreateDirectory("Assets/Generated");
        var renderer = AssetDatabase.LoadAssetAtPath<UniversalRendererData>("Assets/Generated/Renderer.asset");
        if (renderer == null) {
            renderer = ScriptableObject.CreateInstance<UniversalRendererData>();
            AssetDatabase.CreateAsset(renderer, "Assets/Generated/Renderer.asset");
        }
        var occlusion = renderer.rendererFeatures.OfType<ScreenSpaceAmbientOcclusion>().FirstOrDefault();
        if (occlusion == null) {
            occlusion = ScriptableObject.CreateInstance<ScreenSpaceAmbientOcclusion>();
            occlusion.name = "Architectural contact shadows";
            AssetDatabase.AddObjectToAsset(occlusion, renderer);
            renderer.rendererFeatures.Add(occlusion);
        }
        var occlusionSettings = new SerializedObject(occlusion).FindProperty("m_Settings");
        occlusionSettings.FindPropertyRelative("Intensity").floatValue = .7f;
        occlusionSettings.FindPropertyRelative("Radius").floatValue = .3f;
        occlusionSettings.FindPropertyRelative("Downsample").boolValue = true;
        occlusionSettings.serializedObject.ApplyModifiedPropertiesWithoutUndo();
        EditorUtility.SetDirty(renderer);
        var pipeline = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>("Assets/Generated/Pipeline.asset");
        if (pipeline == null) {
            pipeline = UniversalRenderPipelineAsset.Create(renderer);
            AssetDatabase.CreateAsset(pipeline, "Assets/Generated/Pipeline.asset");
        }
        pipeline.name = "Engine study URP";
        pipeline.supportsHDR = true;
        pipeline.msaaSampleCount = 4;
        pipeline.shadowDistance = ReadManifest().study?.shadowDistance ?? 35;
        pipeline.shadowCascadeCount = StudyId == "douro" ? 4 : 1;
        pipeline.mainLightShadowmapResolution = 4096;
        pipeline.maxAdditionalLightsCount = 8;
        var pipelineSettings = new SerializedObject(pipeline);
        var renderers = pipelineSettings.FindProperty("m_RendererDataList");
        renderers.arraySize = 1;
        renderers.GetArrayElementAtIndex(0).objectReferenceValue = renderer;
        pipelineSettings.FindProperty("m_DefaultRendererIndex").intValue = 0;
        pipelineSettings.FindProperty("m_SoftShadowsSupported").boolValue = true;
        pipelineSettings.ApplyModifiedPropertiesWithoutUndo();
        pipeline.supportsCameraOpaqueTexture = true;
        GraphicsSettings.defaultRenderPipeline = pipeline;
        QualitySettings.renderPipeline = pipeline;
        QualitySettings.shadows = UnityEngine.ShadowQuality.All;
        PlayerSettings.colorSpace = ColorSpace.Linear;
        GraphicsSettings.lightsUseLinearIntensity = true;
        PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;
        PlayerSettings.WebGL.dataCaching = true;
        PlayerSettings.WebGL.initialMemorySize = 256;
        PlayerSettings.WebGL.maximumMemorySize = 2048;
        PlayerSettings.companyName = "Diorama Atlas";
        PlayerSettings.productName = StudyId + " engine study";
        PlayerSettings.SetApiCompatibilityLevel(NamedBuildTarget.WebGL, ApiCompatibilityLevel.NET_Standard);
        EditorUtility.SetDirty(pipeline);
        AssetDatabase.SaveAssets();
    }

    public static void Prepare() {
        Configure();
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        string modelPath = "Assets/Imported/" + StudyId + ".glb";
        File.Copy(AssetRoot + StudyId + ".glb", modelPath, true);
        AssetDatabase.ImportAsset(modelPath, ImportAssetOptions.ForceSynchronousImport | ImportAssetOptions.ForceUpdate);
        var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(modelPath);
        if (prefab == null) throw new Exception("glTFast did not produce the scene prefab.");
        var root = (GameObject)PrefabUtility.InstantiatePrefab(prefab);
        var manifest = ReadManifest();
        var study = manifest.study;
        bool outdoor = study != null && study.outdoor;
        var instanceNames = new HashSet<string>((manifest.instanceGroups ?? Array.Empty<StudyInstanceGroup>()).Select(g => g.name));
        var aging = manifest.materials.Where(m => m.patina != null && !string.IsNullOrEmpty(m.patina.profile)).ToDictionary(m => m.name, m => m.patina);
        var aged = new Dictionary<Material, Material>();
        var instancedMaterials = new Dictionary<Material, Material>();
        var tangentMeshes = new Dictionary<Mesh, Mesh>();
        Directory.CreateDirectory("Assets/Generated/Meshes");
        var water = new Material(Shader.Find("Marrakech/Water"));
        if (ShaderUtil.ShaderHasError(water.shader))
            throw new Exception("Invalid native water shader; inspect its compiler messages.");
        AssetDatabase.CreateAsset(water, "Assets/Generated/Water.mat");
        foreach (var mesh in root.GetComponentsInChildren<Renderer>()) {
            mesh.shadowCastingMode = ShadowCastingMode.On;
            mesh.receiveShadows = true;
            bool instanced = instanceNames.Contains(mesh.gameObject.name);
            if (mesh is MeshRenderer && !instanced)
                GameObjectUtility.SetStaticEditorFlags(mesh.gameObject, StaticEditorFlags.BatchingStatic);
            var materials = mesh.sharedMaterials;
            for (int i = 0; i < materials.Length; i++) {
                if (materials[i] == null) throw new Exception("Missing imported material on " + mesh.name);
                var original = materials[i];
                var metadata = manifest.materials.FirstOrDefault(m => m.name == original.name);
                if (outdoor && !original.name.StartsWith("water-")) {
                    if (!instancedMaterials.TryGetValue(original, out var replacement)) {
                        bool weathered = aging.TryGetValue(original.name, out var instanceTreatment);
                        string shaderName = metadata != null && metadata.unlit ? "glTF-unlit.shadergraph" : "glTF-pbrMetallicRoughness.shadergraph";
                        string shaderPath = "Assets/Generated/Instances/" + (weathered ? "Patina-" : "") + shaderName;
                        var shader = AssetDatabase.LoadAssetAtPath<Shader>(shaderPath);
                        if (shader == null || ShaderUtil.ShaderHasError(shader))
                            throw new Exception("Invalid instanced shader: " + shaderPath);
                        replacement = new Material(original) { shader = shader, name = original.name, enableInstancing = true };
                        if (weathered) {
                            ApplyPatina(replacement, instanceTreatment);
                            if (!aged.ContainsKey(original)) aged.Add(original, replacement);
                        }
                        if (metadata?.wind?.anchor != null)
                            replacement.SetVector("_StudyWind", new Vector4(1, metadata.wind.anchor[0], metadata.wind.anchor[1], 0));
                        replacement.SetFloat("_StudyScale", metadata?.metresPerRepeat ?? 0);
                        AssetDatabase.CreateAsset(replacement, "Assets/Generated/Instances/" + original.name + ".mat");
                        instancedMaterials.Add(original, replacement);
                    }
                    materials[i] = replacement;
                    continue;
                }
                if (aging.TryGetValue(original.name, out var treatment)) {
                    if (!aged.TryGetValue(original, out var replacement)) {
                        var shaderPath = "Assets/Generated/Patina/" + Path.GetFileName(AssetDatabase.GetAssetPath(original.shader));
                        var shader = AssetDatabase.LoadAssetAtPath<Shader>(shaderPath);
                        if (shader == null) throw new Exception("Missing native patina shader: " + shaderPath);
                        if (ShaderUtil.ShaderHasError(shader))
                            throw new Exception("Native patina shader has compilation errors: " + shaderPath);
                        replacement = new Material(original) { shader = shader, name = original.name };
                        ApplyPatina(replacement, treatment);
                        AssetDatabase.CreateAsset(replacement, "Assets/Generated/Patina/" + original.name + ".mat");
                        aged.Add(original, replacement);
                    }
                    materials[i] = replacement;
                }
                materials[i].enableInstancing = true;
                if (materials[i].name.StartsWith("water-")) materials[i] = water;
                else if (!Enumerable.Range(0, materials[i].shader.subshaderCount).Any(
                    subshader => materials[i].shader.FindSubshaderTagValue(subshader, new ShaderTagId("RenderPipeline")).name == "UniversalPipeline"))
                    throw new Exception("Imported material does not target URP: " + AssetDatabase.GetAssetPath(materials[i].shader));
            }
            mesh.sharedMaterials = materials;
            if (outdoor || materials.Any(material => material.shader.name.StartsWith("Marrakech/Patina"))) {
                var filter = mesh.GetComponent<MeshFilter>();
                var geometry = filter != null ? filter.sharedMesh : (mesh as SkinnedMeshRenderer)?.sharedMesh;
                if (geometry != null) {
                    var prepared = PrepareSurfaceBasis(geometry, tangentMeshes);
                    if (filter != null) filter.sharedMesh = prepared;
                    else ((SkinnedMeshRenderer)mesh).sharedMesh = prepared;
                }
            }
        }
        if (manifest.instanceGroups?.Length > 0) {
            File.Copy(AssetRoot + "instances.bin", "Assets/Imported/instances.bytes", true);
            AssetDatabase.ImportAsset("Assets/Imported/instances.bytes", ImportAssetOptions.ForceSynchronousImport | ImportAssetOptions.ForceUpdate);
            var drawing = root.AddComponent<StudyInstances>();
            drawing.transforms = AssetDatabase.LoadAssetAtPath<TextAsset>("Assets/Imported/instances.bytes");
            drawing.groups = manifest.instanceGroups;
            drawing.instanceCount = manifest.instances;
            var prototypes = root.GetComponentsInChildren<MeshFilter>().ToDictionary(m => m.gameObject.name, m => m);
            foreach (var group in drawing.groups) {
                if (!prototypes.TryGetValue(group.name, out var filter))
                    throw new Exception("Missing instance prototype: " + group.name);
                var renderer = filter.GetComponent<MeshRenderer>();
                group.mesh = filter.sharedMesh;
                group.material = renderer.sharedMaterial;
                renderer.enabled = false;
            }
        }
        var clips = AssetDatabase.LoadAllAssetsAtPath(modelPath).OfType<AnimationClip>().ToArray();
        if (clips.Length > 0) {
            var controller = AnimatorController.CreateAnimatorControllerAtPath("Assets/Generated/Linen.controller");
            for (int i = 0; i < clips.Length; i++) {
                var settings = AnimationUtility.GetAnimationClipSettings(clips[i]);
                settings.loopTime = true;
                AnimationUtility.SetAnimationClipSettings(clips[i], settings);
                if (i > 0) controller.AddLayer("Linen " + i);
                var layers = controller.layers;
                layers[i].defaultWeight = 1;
                var state = layers[i].stateMachine.AddState("Breeze");
                state.motion = clips[i];
                layers[i].stateMachine.defaultState = state;
                controller.layers = layers;
            }
            var animator = root.GetComponent<Animator>() ?? root.AddComponent<Animator>();
            animator.runtimeAnimatorController = controller;
        }
        RenderSettings.ambientMode = AmbientMode.Trilight;
        RenderSettings.ambientSkyColor = new Color(.26f,.34f,.45f);
        RenderSettings.ambientEquatorColor = new Color(.21f,.18f,.14f);
        RenderSettings.ambientGroundColor = new Color(.1f,.07f,.04f);
        if (outdoor) {
            RenderSettings.ambientSkyColor = new Color(.48f,.59f,.72f);
            RenderSettings.ambientEquatorColor = new Color(.43f,.39f,.31f);
            RenderSettings.ambientGroundColor = new Color(.22f,.19f,.15f);
        }
        RenderSettings.fog = true;
        RenderSettings.fogMode = FogMode.ExponentialSquared;
        RenderSettings.fogDensity = study?.fogDensity ?? .006f;
        RenderSettings.fogColor = study != null ? new Color(study.fogColor[0], study.fogColor[1], study.fogColor[2]) : new Color(.72f,.65f,.53f);
        File.Copy("../../../public/outdoors/detail-assets/daylight-pure-sky_2k.hdr", "Assets/Imported/daylight.hdr", true);
        AssetDatabase.ImportAsset("Assets/Imported/daylight.hdr", ImportAssetOptions.ForceSynchronousImport);
        var sky = new Material(Shader.Find("Skybox/Panoramic"));
        sky.SetTexture("_MainTex", AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/Imported/daylight.hdr"));
        sky.SetFloat("_Exposure", outdoor ? .85f : .6f);
        AssetDatabase.CreateAsset(sky, "Assets/Generated/Sky.mat");
        RenderSettings.skybox = sky;
        var sun = new GameObject("Afternoon sun").AddComponent<Light>();
        sun.type = LightType.Directional;
        sun.color = new Color(1,.93f,.82f);
        sun.intensity = outdoor ? 2.4f : 1.8f;
        sun.transform.position = study != null ? StudyRuntime.Convert(study.sunPosition) : new Vector3(3,13,8);
        sun.transform.LookAt(study != null ? StudyRuntime.Convert(study.sunTarget) : new Vector3(0,0,-2));
        sun.shadows = LightShadows.Soft;
        sun.shadowBias = .025f;
        sun.shadowNormalBias = .06f;
        RenderSettings.sun = sun;
        foreach (var data in manifest.lights.Where(l => l.type == "PointLight")) {
            var light = new GameObject("Lantern bounce").AddComponent<Light>();
            light.type = LightType.Point;
            light.color = new Color(data.color[0],data.color[1],data.color[2]).gamma;
            light.intensity = data.intensity * .18f;
            light.range = data.distance;
            light.transform.position = StudyRuntime.Convert(data.position);
        }
        var camera = new GameObject("Matched camera").AddComponent<Camera>();
        camera.nearClipPlane = .04f;
        camera.farClipPlane = study?.farClip ?? 120;
        camera.backgroundColor = new Color(.58f,.68f,.76f);
        camera.clearFlags = CameraClearFlags.Skybox;
        camera.allowHDR = true;
        camera.GetUniversalAdditionalCameraData().renderPostProcessing = true;
        var volume = new GameObject("Photographic finish").AddComponent<Volume>();
        volume.isGlobal = true;
        var profile = ScriptableObject.CreateInstance<VolumeProfile>();
        profile.Add<Tonemapping>().mode.Override(TonemappingMode.ACES);
        var bloom = profile.Add<Bloom>();
        bloom.intensity.Override(.12f);
        bloom.threshold.Override(1.2f);
        AssetDatabase.CreateAsset(profile, "Assets/Generated/Finish.asset");
        volume.sharedProfile = profile;
        var probe = new GameObject("Courtyard reflection").AddComponent<ReflectionProbe>();
        probe.transform.position = study != null ? StudyRuntime.Convert(study.probePosition) : new Vector3(0,1.05f,-.35f);
        probe.size = study != null ? new Vector3(study.probeSize[0], study.probeSize[1], study.probeSize[2]) : new Vector3(14,15,22);
        probe.farClipPlane = study?.probeFar ?? 60;
        probe.mode = ReflectionProbeMode.Realtime;
        probe.refreshMode = ReflectionProbeRefreshMode.OnAwake;
        probe.resolution = 256;
        probe.boxProjection = true;
        probe.clearFlags = ReflectionProbeClearFlags.Skybox;
        probe.backgroundColor = new Color(.58f,.68f,.76f);
        var runtime = new GameObject("Study").AddComponent<StudyRuntime>();
        runtime.viewCamera = camera;
        if (outdoor) {
            var drawing = root.GetComponent<StudyInstances>();
            drawing.viewCamera = camera;
            drawing.shadowDistance = study.shadowDistance;
            var planar = root.AddComponent<StudyPlanarWater>();
            planar.enabled = false;
            planar.source = camera;
            planar.water = water;
            planar.height = study.probePosition[1] - .5f;
            planar.enabled = true;
            foreach (var mesh in root.GetComponentsInChildren<Renderer>())
                if (mesh.sharedMaterials.Contains(water)) mesh.gameObject.layer = 31;
        }
        runtime.water = water;
        runtime.windMaterials = manifest.materials.Count(m => m.wind?.anchor != null);
        runtime.instances = manifest.instances;
        runtime.patinaMaterials = aged.Count;
        if (aged.Count != aging.Count) throw new Exception("Not all weathered materials were assigned native shaders.");
        runtime.SetView(outdoor
            ? "{\"position\":[7.8,1.72,-1.3],\"target\":[-3,-4.5,-18],\"fov\":64}"
            : "{\"position\":[2.35,1.65,3.55],\"target\":[-0.6,1.65,-2.05],\"fov\":57}");
        if (!outdoor) AddTeaSteam();
        if (outdoor) {
            water.SetFloat("_WaterScale", 1.8f);
            water.SetFloat("_Opacity", 1);
        }
        EditorSceneManager.SaveScene(scene, "Assets/Generated/" + StudyId + ".unity");
        AssetDatabase.SaveAssets();
    }

    private static void ApplyPatina(Material material, PatinaData treatment) {
        var keyword = "ATLAS_PROFILE_" + treatment.profile.ToUpperInvariant();
        if (!material.shader.keywordSpace.FindKeyword(keyword).isValid)
            throw new Exception("Missing specialized weathering variant: " + keyword);
        material.EnableKeyword(keyword);
        material.SetVector("_AtlasPatina", new Vector4(treatment.profileIndex, treatment.strength, treatment.seed, treatment.floor));
        material.SetVector("_AtlasPatinaDetail", new Vector4(treatment.tileGrid[0], treatment.tileGrid[1], treatment.microStrength, 0));
        material.SetVector("_AtlasPatinaUv", new Vector4(treatment.mapTransform[0], treatment.mapTransform[1], treatment.mapTransform[2], treatment.mapTransform[3]));
    }

    private static Mesh PrepareSurfaceBasis(Mesh original, Dictionary<Mesh, Mesh> prepared) {
        if (prepared.TryGetValue(original, out var cached)) return cached;
        var tangents = original.tangents;
        if (tangents.Length == original.vertexCount && tangents.All(t => new Vector3(t.x,t.y,t.z).sqrMagnitude > .0001f))
            return original;
        // Imported subassets are reloaded during the build; persist the repaired copy.
        var mesh = UnityEngine.Object.Instantiate(original);
        mesh.RecalculateTangents();
        tangents = mesh.tangents;
        var normals = mesh.normals;
        if (normals.Length != mesh.vertexCount) throw new Exception("Weathered mesh has no surface normals.");
        if (tangents.Length != mesh.vertexCount) tangents = new Vector4[mesh.vertexCount];
        for (int i = 0; i < tangents.Length; i++) {
            if (new Vector3(tangents[i].x,tangents[i].y,tangents[i].z).sqrMagnitude > .0001f) continue;
            var normal = normals[i];
            var tangent = normal.sqrMagnitude > .0001f
                ? Vector3.Cross(normal, Mathf.Abs(normal.y) < .99f ? Vector3.up : Vector3.right).normalized
                : Vector3.right;
            tangents[i] = new Vector4(tangent.x,tangent.y,tangent.z,1);
        }
        mesh.tangents = tangents;
        AssetDatabase.CreateAsset(mesh, "Assets/Generated/Meshes/Surface-" + prepared.Count + ".asset");
        prepared.Add(original, mesh);
        return mesh;
    }

    private static void AddTeaSteam() {
        var image = new Texture2D(64, 64, TextureFormat.RGBA32, false);
        for (int y = 0; y < 64; y++) for (int x = 0; x < 64; x++) {
            float radius = Vector2.Distance(new Vector2(x,y),new Vector2(32,32)) / 32;
            image.SetPixel(x,y,new Color(1,1,1,Mathf.Pow(Mathf.Max(0,1-radius),2)));
        }
        image.Apply();
        AssetDatabase.CreateAsset(image,"Assets/Generated/Vapour.asset");
        var material = new Material(Shader.Find("Universal Render Pipeline/Particles/Unlit"));
        material.SetTexture("_BaseMap",image);
        material.SetFloat("_Surface",1);
        material.SetFloat("_Blend",0);
        material.SetFloat("_SrcBlend",(float)BlendMode.SrcAlpha);
        material.SetFloat("_DstBlend",(float)BlendMode.OneMinusSrcAlpha);
        material.SetFloat("_ZWrite",0);
        material.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
        material.renderQueue = 3000;
        AssetDatabase.CreateAsset(material,"Assets/Generated/Vapour.mat");
        var steam = new GameObject("Fresh mint tea").AddComponent<ParticleSystem>();
        steam.Stop();
        steam.transform.position = new Vector3(3.12f,.59f,.18f);
        steam.transform.rotation = Quaternion.Euler(-90,0,0);
        var main = steam.main;
        main.startLifetime = 3;
        main.startSpeed = .1f;
        main.startSize = new ParticleSystem.MinMaxCurve(.025f,.065f);
        main.startColor = new Color(1,.95f,.84f,.07f);
        main.maxParticles = 50;
        main.simulationSpace = ParticleSystemSimulationSpace.World;
        var emission = steam.emission;
        emission.rateOverTime = 10;
        var shape = steam.shape;
        shape.shapeType = ParticleSystemShapeType.Cone;
        shape.radius = .025f;
        shape.angle = 7;
        steam.GetComponent<ParticleSystemRenderer>().sharedMaterial = material;
        steam.Play();
    }
}
