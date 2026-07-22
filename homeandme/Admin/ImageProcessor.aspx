<%@ Page Language="C#" AutoEventWireup="true" CodeFile="ImageProcessor.aspx.cs" Inherits="ImageProcessor" %>

<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a"
    Namespace="DevExpress.Web" TagPrefix="dx" %>
<%@ Register Src="~/Admin/Controls/Admincontrols/ImageCrop.ascx" TagPrefix="uc1" TagName="ImageCrop" %>

<!DOCTYPE html>

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <link href="/Admin/adminAsset/css/bootstrap.min.css" rel="stylesheet" />
    <link href="/Admin/adminAsset/css/bootstrap.min.css" rel="stylesheet" />
    <link href="/Admin/adminAsset/css/animate.css" rel="stylesheet" />
    <link href="/Admin/adminAsset/css/style.css" rel="stylesheet" />
    <link href="/Admin/adminAsset/css/DragDrop.css" rel="Stylesheet" />
    <script type="text/javascript">
        function onUploadControlFileUploadComplete(s, e) {
            if (e.isValid) {
                document.getElementById("uploadedImage").src = "/Admin/UploadedFiles/" + e.callbackData;
                document.getElementById("errorMsg").innerHTML = "";
                var field = 'wid';
                var url = window.location.href;
                var key = getQueryString('key', url);
                var windowName = "popConfirm" + key;
                if (url.indexOf('?' + field + '=') != -1) {
                    var p = window.parent;
                    var popup = p.window[windowName];
                    popup.PerformWindowCallback();
                    popup.Show();
                }
                else if (url.indexOf('&' + field + '=') != -1) {
                    var p = window.parent;
                    var popup = p.window[windowName];
                    popup.PerformWindowCallback();
                    popup.Show();
                }
            }
            else {
                document.getElementById("errorMsg").innerHTML = e.callbackData;
            }
            setElementVisible("uploadedImage", e.isValid);
        }
        function onImageLoad() {
            setElementVisible("dragZone", false);
        }
        function setElementVisible(elementId, visible) {
            document.getElementById(elementId).className = visible ? "" : "hidden";
        }
        var getQueryString = function (field, url) {
            var href = url ? url : window.location.href;
            var reg = new RegExp('[?&]' + field + '=([^&#]*)', 'i');
            var string = reg.exec(href);
            return string ? string[1] : null;
        };
    </script>
</head>
<body class="white-bg">
    <form id="form1" runat="server">
        <div class="img-wrap" visible="false" id="divImg" runat="server">
            <img id="newuploadedImage" runat="server" width="160" visible="false" src="#" alt="" />
            <span class="img-close">
                <asp:Button ID="btnDelete" runat="server" Text="Remove" CssClass="btn btn-small btn-yellow" CommandName="2" OnClick="btnDelete_Click" /></span>
        </div>
        <%--        <img id="newuploadedImage" runat="server" src="#" alt="" width="160" visible="false" />--%>
        <div id="div" runat="server">
            <div id="externalDropZone" class="dropZoneExternal">
                <div id="errorMsg" style="color: red; font-size: 12px; width: 100%; background-color: #FFC0CB"></div>
                <div id="dragZone">
                    <span class="dragZoneText">Drag an image or click to select<br />
                        <span style="font-size: 12px">(Max. file size: 4MB)
                            <br />
                            (File format: jpeg/jpg/png)
                            <asp:Literal ID="lblSize" runat="server" /></span></span>
                </div>
                <img id="uploadedImage" src="#" class="hidden" alt="" onload="onImageLoad()" width="160" />
                <div id="dropZone" class="hidden">
                    <span class="dropZoneText">Drag an image or click to select</span>
                </div>
            </div>
        </div>
        <dx:aspxuploadcontrol id="UploadControl" clientinstancename="image" runat="server" uploadmode="Auto" autostartupload="True" width="180"
            showprogresspanel="True" cssclass="uploadControl" dialogtriggerid="externalDropZone" onfileuploadcomplete="UploadControl_FileUploadComplete">
            <advancedmodesettings enabledraganddrop="True" enablefilelist="False" enablemultiselect="False" externaldropzoneid="externalDropZone" dropzonetext="" />
            <validationsettings maxfilesize="104857600" allowedfileextensions=".jpg, .jpeg, .png" errorstyle-cssclass="validationMessage" />
            <browsebutton text="Choose file" />
            <dropzonestyle cssclass="uploadControlDropZone" />
            <progressbarstyle cssclass="uploadControlProgressBar" />
            <clientsideevents
                dropzoneenter="function(s, e) { if(e.dropZone.id == 'externalDropZone') setElementVisible('dropZone', true); }"
                dropzoneleave="function(s, e) { if(e.dropZone.id == 'externalDropZone') setElementVisible('dropZone', false); }"
                fileuploadcomplete="onUploadControlFileUploadComplete">
            </clientsideevents>
        </dx:aspxuploadcontrol>
    </form>
</body>
</html>
