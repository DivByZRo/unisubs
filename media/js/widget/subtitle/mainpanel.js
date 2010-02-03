goog.provide('mirosubs.subtitle.MainPanel');
goog.provide('mirosubs.subtitle.MainPanel.EventType');

/**
 * @fileoverview In this class, the three states {0, 1, 2} correspond to 
 *     { transcribe, sync, review }.
 */

/**
 * 
 * 
 * @param {int} editVersion The caption version we're editing.
 * @param {Array.<Object.<string, *>>} existingCaptions existing captions in 
 *     json object format.
 */
mirosubs.subtitle.MainPanel = function(videoPlayer, 
                                       videoID, 
                                       editVersion, 
                                       existingCaptions) {
    goog.ui.Component.call(this);
    this.videoPlayer_ = videoPlayer;
    this.videoID_ = videoID;
    var uw = this.unitOfWork_ = new mirosubs.UnitOfWork();
    this.editVersion_ = editVersion;
    /**
     * Array of captions.
     * @type {Array.<mirosubs.subtitle.EditableCaption>}
     */
    this.captions_ = 
        goog.array.map(existingCaptions, 
                       function(caption) { 
                           return new mirosubs.subtitle.EditableCaption(uw, caption);
                       });
    this.captionManager_ = 
        new mirosubs.CaptionManager(videoPlayer.getPlayheadFn());
    this.captionManager_.addCaptions(existingCaptions);
    this.getHandler().listen(this.captionManager_,
                             mirosubs.CaptionManager.EventType.CAPTION,
                             this.captionReached_, false, this);
    this.saveManager_ = this.createSaveManager_(videoID, editVersion, uw);
    this.lockManager_ = new mirosubs.subtitle.LockManager(
        'update_video_lock', { 'video_id' : videoID });
    this.tabs_ = [];
    this.showingInterPanel_ = false;
};
goog.inherits(mirosubs.subtitle.MainPanel, goog.ui.Component);

mirosubs.subtitle.MainPanel.EventType = {
    FINISHED: "finishedediting"
};

mirosubs.subtitle.MainPanel.prototype.createSaveManager_ = 
    function(videoID, editVersion, unitOfWork) {
    var toJsonCaptions = function(arr) {
        return goog.array.map(arr, function(editableCaption) {
                return editableCaption.jsonCaption;
            });
    };
    return new mirosubs.subtitle.SaveManager(
        unitOfWork, "save_captions", function(work) {
            return {
                "video_id" : videoID,
                "version_no" : editVersion,
                "deleted" : toJsonCaptions(work.deleted),
                "inserted" : toJsonCaptions(work.neu),
                "updated" : toJsonCaptions(work.updated)
            };
        });
};

mirosubs.subtitle.MainPanel.prototype.getContentElement = function() {
    return this.contentElem_;
};

mirosubs.subtitle.MainPanel.prototype.createDom = function() {
    mirosubs.subtitle.MainPanel.superClass_.createDom.call(this);

    var that = this;
    var el = this.getElement();
    var $d = goog.bind(this.getDomHelper().createDom, this.getDomHelper());

    el.appendChild(this.contentElem_ = $d('div'));
    el.appendChild($d('div', { 'className': 'mirosubs-nextStep' },
                      this.nextMessageSpan_ = $d('span'),
                      this.nextStepLink_ = $d('a', { 'href': '#'})));
    this.getHandler().listen(this.nextStepLink_, 'click', 
                             this.nextStepClicked_, false, this);
    this.tabs_ = this.createTabElems_()
    el.appendChild($d('ul', { 'className' : 'mirosubs-nav' }, this.tabs_));
    this.setState_(0);
};

mirosubs.subtitle.MainPanel.prototype.setNextStepText = 
    function(messageText, buttonText) {
    var $c = goog.dom.setTextContent;
    $c(this.nextMessageSpan_, messageText);
    $c(this.nextStepLink_, buttonText);
};

mirosubs.subtitle.MainPanel.prototype.createTabElems_ = function() {
    var that = this;
    var h = this.getHandler();
    var $d = goog.bind(this.getDomHelper().createDom, this.getDomHelper());
    return goog.array.map(["Transcribe", "Sync", "Review"],
                          function(label, index) {
                              var a = $d('a', { 'href': '#' }, label);
                              h.listen(a, 'click', 
                                       function(event) {
                                           that.setState_(index);
                                           event.preventDefault();
                                       });
                              return $d('li', 
                                        {'className': 'mirosubs-nav' + label}, 
                                        a);
                          });
};
mirosubs.subtitle.MainPanel.prototype.captionReached_ = function(jsonCaptionEvent) {
    var c = jsonCaptionEvent.caption;
    this.videoPlayer_.showCaptionText(c ? c['caption_text'] : '');
};
mirosubs.subtitle.MainPanel.prototype.nextStepClicked_ = function(event) {
    this.setState_(this.state_ + 1);
    event.preventDefault();
};
mirosubs.subtitle.MainPanel.prototype.setState_ = function(state) {
    if (this.showingInterPanel_ || state == 0) {
        this.showingInterPanel_ = false;
        this.disposeCurrentWidget_();
        if (state < 3) {
            this.removeChildren(true);
            this.state_ = state;
            this.videoPlayer_.setPlayheadTime(0);
            this.selectTab_(state);
            this.addChild(this.makeNextWidget_(state), true);
            this.setNextStepText("When you're done, click here", "Next Step");
        }
        else
            this.finishEditing_();
    }
    else {
        this.removeChildren(true);
        this.showingInterPanel_ = true;
        this.addChild(this.makeInterPanel_(state), true);
        if (state == 3)
            this.setNextStepText("Click close to finish", "Close");
    }
};
mirosubs.subtitle.MainPanel.prototype.selectTab_ = function(state) {
    var c = goog.dom.classes;
    for (var i = 0; i < this.tabs_.length; i++) {
        if (i == state)
            c.add(this.tabs_[i], 'active');
        else
            c.remove(this.tabs_[i], 'active');
    }
};

mirosubs.subtitle.MainPanel.prototype.disposeCurrentWidget_ = function() {
    if (this.currentWidget_) {
        this.currentWidget_.dispose();
        this.currentWidget_ = null;
    }
};

mirosubs.subtitle.MainPanel.prototype.makeNextWidget_ = function(state) {
    if (state == 0)
        this.currentWidget_ = new mirosubs.subtitle.TranscribePanel(
            this.captions_, this.unitOfWork_);
    else if (state == 1)
        this.currentWidget_ = new mirosubs.subtitle.SyncPanel(
            this.captions_, 
            this.videoPlayer_.getPlayheadFn(), 
            this.captionManager_);
    else if (state == 2)
        this.currentWidget_ = new mirosubs.subtitle.SyncPanel(
            this.captions_, 
            this.videoPlayer_.getPlayheadFn(), 
            this.captionManager_);    
    return this.currentWidget_;
};

mirosubs.subtitle.MainPanel.prototype.makeInterPanel_ = function(state) {
    if (state < 3)
        return new mirosubs.subtitle.InterPanel("Great job, carry on!");
    else
        return new mirosubs.subtitle
            .InterPanel("Thank you, click close to end the session",
                        "finished");
};

mirosubs.subtitle.MainPanel.prototype.finishEditing_ = function() {
    var that = this;
    // TODO: show loading
    this.saveManager_.saveNow(function() {
            mirosubs.Rpc.call("finished_captions", {
                    "video_id" : that.videoID_
                }, function() {
                    // TODO: hide loading.
                    that.dispatchEvent(mirosubs.subtitle.MainPanel
                                       .EventType.FINISHED);
                    that.dispose();
                });
        });
};

mirosubs.subtitle.MainPanel.prototype.disposeInternal = function() {
    mirosubs.subtitle.MainPanel.superClass_.disposeInternal.call(this);
    this.disposeCurrentWidget_();
    this.saveManager_.dispose();
    this.lockManager_.dispose();
    this.captionManager_.dispose();
};